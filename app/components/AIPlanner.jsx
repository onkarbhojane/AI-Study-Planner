// AIPlannerScreen.js
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

const API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key";
const USE_MOCK_API = false;

export default function AIPlanner({ navigation, route }) {
  const { days, setDays } = route.params;
  const [userPrompt, setUserPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState(
    "AIzaSyBWfxTjfJKHYL6nN87dwjFSz1pdTG9IEZQ"
  );
  const [error, setError] = useState("");

  const generateAIPlan = async () => {
    if (!userPrompt.trim()) {
      setError("Please describe your goals first");
      return;
    }

    setGenerating(true);
    setError("");

    try {
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
                  text:
                    userPrompt +
                    `\n\nProvide a daily timetable based on my goals. Format the response EXACTLY as follows:\n\nYour weekly plan:\n- 7:00 AM: Activity description\n- 9:00 AM: Activity description\n- 11:00 AM: Activity description\n\nImportant: Use hyphen bullets, time in 12-hour format with AM/PM, and a colon after the time.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const aiText =
        result.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No content returned.";

      const parseAITextToTasks = (aiText) => {
        const taskLines = aiText
          .split("\n")
          .filter((line) =>
            line.match(/^\s*[-•*]\s*\d{1,2}[:.]\d{2}\s*(AM|PM|am|pm)/i)
          );

        return taskLines
          .map((line) => {
            const match = line.match(
              /^\s*[-•*]\s*(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?)\s*[:-]?\s*(.*)/i
            );

            if (!match) return null;

            // Normalize time format (replace dots with colons)
            const time = match[1].replace(".", ":").toUpperCase();
            const activity = match[2].trim();

            return {
              id: Date.now() + Math.random(),
              text: `${activity} (${time})`,
              completed: false,
              points: Math.floor(Math.random() * 6 + 5),
              time,
            };
          })
          .filter((task) => task !== null);
      };

      const tasks = parseAITextToTasks(aiText);

      if (tasks.length === 0) {
        throw new Error(
          "Couldn't parse timetable format. Please try a different prompt."
        );
      }

      const updatedDays = days.map((day) => ({
        ...day,
        tasks,
      }));

      setDays(updatedDays);
      Alert.alert(
        "AI Timetable Generated",
        "Your schedule was successfully created!"
      );
    } catch (err) {
      console.error("API Error:", err);
      setError(
        err.message || "Failed to generate timetable. Please try again."
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
      <Text style={styles.title}>AI Weekly Planner</Text>
      <Text style={styles.description}>
        Describe your goals, study time, breaks, and activities. Our AI will
        create a personalized weekly timetable.
      </Text>

      {!USE_MOCK_API && (
        <View style={styles.apiKeyContainerWrap}>
          <Text style={styles.apiLabel}>Secret API Key</Text>
          <TextInput
            style={styles.apiInputFull}
            placeholder="Enter your Gemmini API key"
            secureTextEntry
            value={apiKey}
            onChangeText={setApiKey}
          />
        </View>
      )}

      <TextInput
        style={styles.input}
        multiline
        placeholder="E.g., I need to study 3 hours daily, workout in mornings, have coding sessions after lunch, and relax in evenings. I prefer starting at 8 AM."
        placeholderTextColor="#888"
        value={userPrompt}
        onChangeText={(text) => {
          setUserPrompt(text);
          setError("");
        }}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[
          styles.generateButton,
          (generating || !userPrompt.trim()) && styles.disabledButton,
        ]}
        onPress={generateAIPlan}
        disabled={generating || !userPrompt.trim()}
      >
        {generating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.buttonText}>Generate Timetable</Text>
            <MaterialIcons
              name="autorenew"
              size={20}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.tipContainer}>
        <MaterialIcons name="lightbulb" size={20} color="#FFD700" />
        <Text style={styles.tipText}>
          Tip: Be specific! Include preferred start times, subjects, and
          activities for better results
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#f5f7ff",
    minHeight: "100%",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#4a4e69",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#5a5a5a",
    marginBottom: 25,
    lineHeight: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 12,
    fontSize: 16,
    height: 170,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 15,
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
    marginTop: 10,
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#a5a5a5",
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff6b6b",
    marginTop: 5,
    textAlign: "center",
    fontWeight: "500",
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
  apiKeyContainerWrap: {
    marginBottom: 15,
    padding: 10,
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
  apiInputFull: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
  },
});
