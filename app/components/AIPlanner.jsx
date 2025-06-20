import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key";
const USE_MOCK_API = false;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AIPlanner({ navigation, route }) {
  const { days, setDays, currentTask } = route.params;
  const [userPrompt, setUserPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState("AIzaSyBWfxTjfJKHYL6nN87dwjFSz1pdTG9IEZQ");
  const [error, setError] = useState("");

  const validateTasks = (tasks) => {
    if (!Array.isArray(tasks)) return false;
    
    return tasks.every(task => {
      const hasRequiredFields = task.task && task.start_time && task.end_time;
      const isValidTimeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(task.start_time) && 
                              /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(task.end_time);
      const isValidCredits = task.credits >= 1 && task.credits <= 10;
      
      return hasRequiredFields && isValidTimeFormat && isValidCredits;
    });
  };

  const generateAIPlan = async () => {
    if (!userPrompt.trim()) {
      setError("Please describe your goals first");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const isDaily = currentTask !== "weekly";
      const prompt = `Create a ${isDaily ? "daily" : "weekly"} timetable in JSON format based on these requirements:
      ${userPrompt}
      
      Return ONLY a valid JSON array of task objects with these exact fields:
      - task (string): Task name/description
      - start_time (string): Start time in 24h format (HH:MM)
      - end_time (string): End time in 24h format (HH:MM)
      - credits (number): Importance points (1-10)
      - notes (string): Additional details
      ${isDaily ? "" : "- day (string): Weekday name (Monday-Sunday)"}
      
      Example response for ${isDaily ? "daily" : "weekly"}:
      ${isDaily ? `
      [
        {
          "task": "Morning Exercise",
          "start_time": "07:00",
          "end_time": "08:00",
          "credits": 8,
          "notes": "Yoga and stretching"
        }
      ]` : `
      [
        {
          "task": "Team Meeting",
          "start_time": "10:00",
          "end_time": "11:00",
          "credits": 9,
          "notes": "Weekly project sync",
          "day": "Monday"
        }
      ]`}`;

      const response = await fetch(`${API_ENDPOINT}=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("AI Response:", aiText);
      
      const parseTasks = (text) => {
        try {
          // First attempt to find JSON in the response
          const jsonStart = text.indexOf('[');
          const jsonEnd = text.lastIndexOf(']') + 1;
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = text.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(jsonString);
            
            if (Array.isArray(parsed)) {
              return parsed.map(task => ({
                task: task.task || "Unnamed Task",
                start_time: task.start_time || "00:00",
                end_time: task.end_time || "00:00",
                credits: Math.min(10, Math.max(1, Number(task.credits) || 5)),
                notes: task.notes || "",
                day: task.day || ""
              }));
            }
          }
          
          // Fallback for non-JSON responses
          const taskRegex = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}):?\s*(.*?)\s*(?:\|\s*Priority:\s*(\w+))?\s*(?:\|\s*Notes:\s*(.*))?/gi;
          const tasks = [];
          let match;

          while ((match = taskRegex.exec(text)) !== null) {
            const [, start, end, taskName, priority, notes] = match;
            const credits = priority 
              ? { high: 9, medium: 6, low: 3 }[priority.toLowerCase()] || 5
              : 5;

            tasks.push({
              task: taskName?.trim() || "Unnamed Task",
              start_time: start,
              end_time: end,
              credits,
              notes: notes?.trim() || "",
              day: ""
            });
          }
          return tasks;
        } catch (e) {
          console.error("Parsing error:", e);
          return [];
        }
      };

      let tasks = parseTasks(aiText);
      console.log("Parsed Tasks:", tasks);
      if (tasks.length === 0 || !validateTasks(tasks)) {
        throw new Error("Couldn't create a valid timetable. Please try being more specific in your request.");
      }

      // Process tasks for the schedule
      let updatedDays;
      if (isDaily) {
        const today = new Date().toLocaleString('en-US', { weekday: 'long' });
        updatedDays = days.map(day => ({
          ...day,
          tasks: day.name === today ? 
            tasks.map(t => ({
              id: Date.now() + Math.random(),
              text: `${t.task} (${t.start_time}-${t.end_time})`,
              completed: false,
              points: t.credits,
              time: `${t.start_time}-${t.end_time}`,
              note: t.notes
            })) : 
            [...day.tasks] // Preserve existing tasks for other days
        }));
      } else {
        // For weekly, assign tasks to their respective days
        const dayTasks = {};
        WEEKDAYS.forEach(day => {
          dayTasks[day] = tasks
            .filter(t => t.day.toLowerCase() === day.toLowerCase())
            .map(t => ({
              id: Date.now() + Math.random(),
              text: `${t.task} (${t.start_time}-${t.end_time})`,
              completed: false,
              points: t.credits,
              time: `${t.start_time}-${t.end_time}`,
              note: t.notes
            }));
        });

        updatedDays = days.map(day => ({
          ...day,
          tasks: [...dayTasks[day.name] || []] // Combine new tasks with existing ones
        }));
      }
      
      setDays(updatedDays);
      Alert.alert(
        "Success",
        `Your ${isDaily ? "daily" : "weekly"} timetable was generated successfully!`,
        [
          { 
            text: "View Schedule", 
            onPress: () => navigation.goBack() 
          },
          {
            text: "Add More",
            onPress: () => setUserPrompt(""),
            style: "cancel"
          }
        ]
      );
    } catch (err) {
      console.error("Error:", err);
      setError(
        err.message.includes("Failed to fetch") ? 
        "Network error. Please check your connection." :
        err.message.includes("API key") ?
        "Invalid API key. Please check your Gemini API key." :
        err.message
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar backgroundColor="#6200ee" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#4a4e69" />
        </TouchableOpacity>
        <Text style={styles.title}>AI {currentTask === "daily" ? "Daily" : "Weekly"} Planner</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <Text style={styles.description}>
        Describe your goals and preferences to generate a personalized {currentTask} schedule.
      </Text>

      {!USE_MOCK_API && (
        <View style={styles.apiKeyContainer}>
          <Text style={styles.apiLabel}>API Key (required)</Text>
          <TextInput
            style={styles.apiInput}
            placeholder="Enter your Gemini API key"
            secureTextEntry
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.apiNote}>
            Note: The app includes a default key that may have usage limits
          </Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        multiline
        numberOfLines={5}
        placeholder={`Example: ${
          currentTask === "daily" 
            ? "I need to study Math from 9-11, workout at 7am, and have free time after 6pm." 
            : "I want to study on weekdays 9-11, workout Mon/Wed/Fri mornings, and relax on weekends."
        }`}
        placeholderTextColor="#888"
        value={userPrompt}
        onChangeText={(text) => {
          setUserPrompt(text);
          setError("");
        }}
      />

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={20} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.generateButton,
          (generating || !userPrompt.trim()) && styles.disabledButton,
        ]}
        onPress={generateAIPlan}
        disabled={generating || !userPrompt.trim()}
      >
        {generating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>Generate Timetable</Text>
            <MaterialIcons name="autorenew" size={20} color="#fff" style={styles.buttonIcon} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.tipContainer}>
        <MaterialIcons name="lightbulb" size={20} color="#FFD700" />
        <Text style={styles.tipText}>
          {currentTask === "daily"
            ? "Tip: Be specific about activities, durations, and preferred times for better results"
            : "Tip: Mention which activities repeat on certain weekdays and any time constraints"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f7ff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4a4e69",
    textAlign: "center",
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: "#5a5a5a",
    marginBottom: 25,
    lineHeight: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  generateButton: {
    backgroundColor: "#6a11cb",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#aaa",
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: "#ff6b6b",
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffae6",
    padding: 15,
    borderRadius: 10,
    marginTop: 25,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  tipText: {
    marginLeft: 10,
    color: "#5a5a5a",
    flex: 1,
    fontSize: 14,
  },
  apiKeyContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  apiLabel: {
    fontWeight: "600",
    marginBottom: 6,
    fontSize: 15,
    color: "#4a4e69",
  },
  apiInput: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
    marginBottom: 8,
  },
  apiNote: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
});