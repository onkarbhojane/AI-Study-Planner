// App.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Modal,
  Easing,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  StatusBar,
  Button,
  Platform,
} from "react-native";
import plus from "../../assets/images/plus.png";
import { useNavigation } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Audio } from "expo-av";
import refresh from "../../assets/images/refresh.png";
export default function App() {
  const [days, setDays] = useState([
    { id: 0, name: "Monday", tasks: [] },
    { id: 1, name: "Tuesday", tasks: [] },
    { id: 2, name: "Wednesday", tasks: [] },
    { id: 3, name: "Thursday", tasks: [] },
    { id: 4, name: "Friday", tasks: [] },
    { id: 5, name: "Saturday", tasks: [] },
    { id: 6, name: "Sunday", tasks: [] },
  ]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rewardMessage, setRewardMessage] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [plannerModalVisible, setPlannerModalVisible] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [newPointsValue, setNewPointsValue] = useState("");
  const [taskDetailsModalVisible, setTaskDetailsModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState({
    text: "",
    points: 10,
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 60 * 60 * 1000),
    note: "",
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState("start");
  const [sound, setSound] = useState();
  const bounceAnim = new Animated.Value(0);
  const navigation = useNavigation();

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await AsyncStorage.getItem("timetableData");
        if (savedData) {
          const { days: savedDays, totalPoints: savedPoints } =
            JSON.parse(savedData);
          const parsedDays = savedDays.map((day) => ({
            ...day,
            tasks: day.tasks.map((task) => ({
              ...task,
              startTime: task.startTime ? new Date(task.startTime) : null,
              endTime: task.endTime ? new Date(task.endTime) : null,
            })),
          }));
          setDays(parsedDays);
          setTotalPoints(savedPoints);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };

    loadData();
  }, []);

  // Save data
  useEffect(() => {
    const saveData = async () => {
      try {
        const dataToSave = JSON.stringify({ days, totalPoints });
        await AsyncStorage.setItem("timetableData", dataToSave);
      } catch (e) {
        console.error("Failed to save data", e);
      }
    };

    saveData();
  }, [days, totalPoints]);

  // Sound cleanup
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const triggerBounce = () => {
    bounceAnim.setValue(0);
    Animated.timing(bounceAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.elastic(2),
      useNativeDriver: true,
    }).start();
  };

  const playSuccessSound = async () => {
    try {
      // Load and play the sound
      const { sound: soundObject } = await Audio.Sound.createAsync(
        require("../../assets/sounds/success.mp3")
      );
      setSound(soundObject);
      await soundObject.playAsync();
    } catch (error) {
      console.error("Error playing sound", error);
    }
  };

  const openTaskDetailsModal = () => {
    setCurrentTask({
      text: "",
      points: Math.floor(Math.random() * 15) + 5,
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + 60 * 60 * 1000),
      note: "",
    });
    setTaskDetailsModalVisible(true);
  };

  const handleTimeChange = (event, selectedDate, mode) => {
    setShowTimePicker(false);
    if (selectedDate) {
      if (mode === "start") {
        setCurrentTask({ ...currentTask, startTime: selectedDate });
        // Auto-set end time to 1 hour after start if end is before start
        if (selectedDate >= currentTask.endTime) {
          setCurrentTask({
            ...currentTask,
            startTime: selectedDate,
            endTime: new Date(selectedDate.getTime() + 60 * 60 * 1000),
          });
        } else {
          setCurrentTask({ ...currentTask, startTime: selectedDate });
        }
      } else {
        setCurrentTask({ ...currentTask, endTime: selectedDate });
      }
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const addTask = () => {
    if (!currentTask.text.trim()) return;

    const newTaskItem = {
      id: Date.now(),
      text: currentTask.text,
      completed: false,
      points: currentTask.points,
      startTime: currentTask.startTime,
      endTime: currentTask.endTime,
      note: currentTask.note,
    };

    const updatedDays = [...days];
    updatedDays[selectedDay].tasks.push(newTaskItem);
    setDays(updatedDays);
    setTaskDetailsModalVisible(false);
    Keyboard.dismiss();
  };

  const toggleTask = async (taskId) => {
    if (editingPoints) return;

    const updatedDays = [...days];
    const taskIndex = updatedDays[selectedDay].tasks.findIndex(
      (t) => t.id === taskId
    );
    const task = updatedDays[selectedDay].tasks[taskIndex];

    task.completed = !task.completed;

    if (task.completed) {
      setTotalPoints((prev) => prev + task.points);
      setRewardMessage(`+${task.points} points!`);
      setShowConfetti(true);
      triggerBounce();

      // Play success sound
      await playSuccessSound();

      setTimeout(() => setShowConfetti(false), 2000);
      setTimeout(() => setRewardMessage(""), 3000);
    } else {
      setTotalPoints((prev) => prev - task.points);
    }

    setDays(updatedDays);
  };

  const deleteTask = (taskId) => {
    if (editingPoints) return; // Prevent deletion while editing points

    const updatedDays = [...days];
    updatedDays[selectedDay].tasks = updatedDays[selectedDay].tasks.filter(
      (t) => t.id !== taskId
    );
    setDays(updatedDays);
  };

  const startEditingPoints = (taskId, currentPoints) => {
    setEditingPoints(true);
    setEditingTaskId(taskId);
    setNewPointsValue(currentPoints.toString());
  };

  const saveEditedPoints = () => {
    if (!newPointsValue) return;

    const pointsValue = parseInt(newPointsValue);
    if (isNaN(pointsValue)) return;

    const updatedDays = [...days];
    const dayIndex = selectedDay;
    const taskIndex = updatedDays[dayIndex].tasks.findIndex(
      (t) => t.id === editingTaskId
    );

    // Adjust total points if task was completed
    const task = updatedDays[dayIndex].tasks[taskIndex];
    const pointsDiff = pointsValue - task.points;

    if (task.completed) {
      setTotalPoints((prev) => prev + pointsDiff);
    }

    updatedDays[dayIndex].tasks[taskIndex].points = pointsValue;
    setDays(updatedDays);

    // Reset editing state
    setEditingPoints(false);
    setEditingTaskId(null);
    setNewPointsValue("");
  };

  const renderTask = ({ item }) => {
    const scale = bounceAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 1.2, 1],
    });
    const isEditing = editingPoints && editingTaskId === item.id;

    return (
      <Animated.View
        style={[
          styles.taskItem,
          item.completed && styles.completedTask,
          { transform: [{ scale: item.completed ? scale : 1 }] },
        ]}
      >
        <StatusBar backgroundColor="#6200ee" barStyle="light-content" />
        <TouchableOpacity
          onPress={() => toggleTask(item.id)}
          style={styles.taskContent}
          disabled={isEditing}
        >
          <MaterialIcons
            name={item.completed ? "check-box" : "check-box-outline-blank"}
            size={28}
            color={item.completed ? "#4CAF50" : "#ccc"}
          />
          <View style={styles.taskDetails}>
            <Text
              style={[styles.taskText, item.completed && styles.completedText]}
            >
              {item.text}
            </Text>

            {(item.startTime || item.endTime || item.note) && (
              <View style={styles.taskMeta}>
                {item.startTime && item.endTime && (
                  <View style={styles.timeContainer}>
                    <MaterialIcons name="access-time" size={16} color="#666" />
                    <Text style={styles.timeText}>
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </Text>
                  </View>
                )}

                {item.note && (
                  <View style={styles.noteContainer}>
                    <MaterialIcons name="notes" size={16} color="#666" />
                    <Text style={styles.noteText} numberOfLines={1}>
                      {item.note}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actionsContainer}>
          {isEditing ? (
            <TextInput
              style={[
                styles.pointsBadge,
                styles.pointsInput,
                styles.pointsBadgeEnlarged,
              ]}
              value={newPointsValue}
              onChangeText={setNewPointsValue}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={saveEditedPoints}
              onBlur={saveEditedPoints}
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              onPress={() => startEditingPoints(item.id, item.points)}
              style={[
                styles.pointsBadge,
                isEditing && styles.pointsBadgeEnlarged,
              ]}
            >
              <Text style={styles.pointsText}>+{item.points}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => deleteTask(item.id)}
            style={styles.deleteButton}
            disabled={isEditing}
          >
            <MaterialIcons
              name="delete"
              size={24}
              color={isEditing ? "#ccc" : "#ff6b6b"}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderReward = (icon, name, cost) => (
    <TouchableOpacity
      style={[
        styles.rewardCard,
        totalPoints >= cost ? styles.rewardAvailable : styles.rewardLocked,
      ]}
      onPress={() => {
        if (totalPoints >= cost) {
          setTotalPoints((prev) => prev - cost);
          setRewardMessage(`Enjoy your ${name}!`);
          setTimeout(() => setRewardMessage(""), 3000);
        }
      }}
    >
      <Text style={styles.rewardIcon}>{icon}</Text>
      <Text style={styles.rewardName}>{name}</Text>
      <View style={styles.rewardCost}>
        <Text style={styles.costText}>{cost} pts</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f4ff" }}>
      <StatusBar backgroundColor="#6200ee" barStyle="light-content" />
      <TouchableWithoutFeedback
        onPress={() => {
          if (editingPoints) {
            saveEditedPoints();
          }
        }}
      >
        <View style={styles.container}>
          {showConfetti && (
            <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} />
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🌟 Productivity Planner</Text>
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsText}>🏆 {totalPoints} points</Text>
              {rewardMessage ? (
                <Text style={styles.rewardMessage}>{rewardMessage}</Text>
              ) : null}
            </View>
          </View>

          {/* Day Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.daySelector}
          >
            {days.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  selectedDay === day.id && styles.selectedDay,
                ]}
                onPress={() => setSelectedDay(day.id)}
              >
                <Text
                  style={[
                    styles.dayText,
                    selectedDay === day.id && styles.selectedDayText,
                  ]}
                >
                  {day.name.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Current Day */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              alignContent: "center",
              marginBottom: 20,
            }}
          >
            <Text style={[styles.dayTitle,{marginTop: 15}]}>
              {days[selectedDay].name}'s Tasks
            </Text>
            <TouchableOpacity
              style={[styles.aiButton,{position: "absolute", right: 100}]}
              onPress={() =>
                setDays([
                  { id: 0, name: "Monday", tasks: [] },
                  { id: 1, name: "Tuesday", tasks: [] },
                  { id: 2, name: "Wednesday", tasks: [] },
                  { id: 3, name: "Thursday", tasks: [] },
                  { id: 4, name: "Friday", tasks: [] },
                  { id: 5, name: "Saturday", tasks: [] },
                  { id: 6, name: "Sunday", tasks: [] },
                ])
              }
            >
              <View style={styles.aiButtonText}>
                <Image source={refresh} style={
                    {
                      width: 20,
                      height: 20,
                      tintColor: "#fff",
                    }
                } />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => setPlannerModalVisible(true)}
            >
              <Text style={styles.aiButtonText}>Try AI</Text>
            </TouchableOpacity>
          </View>
          {days[selectedDay].tasks.length > 0 ? (
            <FlatList
              data={days[selectedDay].tasks}
              renderItem={renderTask}
              keyExtractor={(item) => item.id.toString()}
              style={styles.taskList}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No tasks yet. Add your first task!
              </Text>
              <Text style={styles.emptyIcon}>📅</Text>
            </View>
          )}

          <Modal
            animationType="slide"
            transparent={true}
            visible={taskDetailsModalVisible}
            onRequestClose={() => setTaskDetailsModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.taskModalContainer}>
                <View style={styles.taskModalContent}>
                  <Text style={styles.taskModalTitle}>Add New Task</Text>

                  <Text style={styles.inputLabel}>Task Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={currentTask.text}
                    onChangeText={(text) =>
                      setCurrentTask({ ...currentTask, text })
                    }
                    placeholder="What do you need to do?"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.inputLabel}>Points</Text>
                  <View style={styles.pointsInputContainer}>
                    <TextInput
                      style={[styles.modalInput, styles.pointsInput]}
                      value={currentTask.points.toString()}
                      onChangeText={(text) => {
                        const points = parseInt(text) || 0;
                        if (!isNaN(points)) {
                          setCurrentTask({ ...currentTask, points });
                        }
                      }}
                      keyboardType="numeric"
                    />
                    <Text style={styles.pointsLabel}>points</Text>
                  </View>

                  <Text style={styles.inputLabel}>Time</Text>
                  <View style={styles.timeInputContainer}>
                    <TouchableOpacity
                      style={styles.timeInput}
                      onPress={() => {
                        setTimePickerMode("start");
                        setShowTimePicker(true);
                      }}
                    >
                      <MaterialIcons
                        name="access-time"
                        size={20}
                        color="#6200ee"
                      />
                      <Text style={styles.timeText}>
                        {formatTime(currentTask.startTime)}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.timeSeparator}>to</Text>

                    <TouchableOpacity
                      style={styles.timeInput}
                      onPress={() => {
                        setTimePickerMode("end");
                        setShowTimePicker(true);
                      }}
                    >
                      <MaterialIcons
                        name="access-time"
                        size={20}
                        color="#6200ee"
                      />
                      <Text style={styles.timeText}>
                        {formatTime(currentTask.endTime)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showTimePicker && (
                    <DateTimePicker
                      value={
                        timePickerMode === "start"
                          ? currentTask.startTime
                          : currentTask.endTime
                      }
                      mode="time"
                      display="spinner"
                      onChange={(event, date) =>
                        handleTimeChange(event, date, timePickerMode)
                      }
                    />
                  )}

                  <Text style={styles.inputLabel}>Note (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.noteInput]}
                    value={currentTask.note}
                    onChangeText={(note) =>
                      setCurrentTask({ ...currentTask, note })
                    }
                    placeholder="Add details or description..."
                    placeholderTextColor="#999"
                    multiline
                  />

                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setTaskDetailsModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.addButton]}
                      onPress={addTask}
                      disabled={!currentTask.text.trim()}
                    >
                      <Text style={styles.addButtonText}>Add Task</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <Modal
            animationType="fade"
            transparent={true}
            visible={plannerModalVisible}
            onRequestClose={() => setPlannerModalVisible(false)}
          >
            <View style={styles.plannerModalOverlay}>
              <View style={styles.plannerModalContainer}>
                <Text style={styles.plannerModalTitle}>AI Task Generator</Text>

                {/* Weekly Planner Button */}
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("AIPlanner", {
                      days,
                      setDays,
                      currentTask: "weekly",
                    });
                    setPlannerModalVisible(false);
                  }}
                  style={styles.plannerModalButton}
                >
                  <View style={styles.plannerButtonContent}>
                    <MaterialIcons name="date-range" size={24} color="white" />
                    <Text style={styles.plannerModalButtonText}>
                      Weekly Tasks
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Daily Planner Button */}
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("AIPlanner", {
                      days,
                      setDays,
                      currentTask: days[selectedDay].name.toLowerCase(),
                    });
                    setPlannerModalVisible(false);
                  }}
                  style={[styles.plannerModalButton, styles.dailyButton]}
                >
                  <View style={styles.plannerButtonContent}>
                    <MaterialIcons name="today" size={24} color="white" />
                    <Text style={styles.plannerModalButtonText}>
                      Daily Tasks
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPlannerModalVisible(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Rewards Section */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.rewardsButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.rewardsButtonText}>🎁 Your Rewards</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingButton}
              onPress={openTaskDetailsModal}
            >
              <Text style={styles.floatingButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Rewards Modal */}
          <Modal
            animationType="slide"
            transparent={false}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🎁 Reward Store</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.rewardsGrid}>
                {renderReward("🍦", "Ice Cream", 50)}
                {renderReward("🎮", "Game Time", 100)}
                {renderReward("🎬", "Movie Night", 150)}
                {renderReward("🎁", "Special Gift", 300)}
                {renderReward("☕", "Coffee Break", 40)}
                {renderReward("📚", "New Book", 120)}
              </View>

              <View style={styles.pointsDisplay}>
                <Text style={styles.availablePoints}>
                  Your Points: {totalPoints}
                </Text>
              </View>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4ff",
    paddingTop: 10,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  pointsContainer: {
    alignItems: "flex-end",
  },
  pointsText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a11cb",
  },
  rewardMessage: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 4,
  },
  daySelector: {
    marginBottom: 20,
    maxHeight: 50,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 25,
    backgroundColor: "#e9ecef",
  },
  selectedDay: {
    backgroundColor: "#6a11cb",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6c757d",
  },
  selectedDayText: {
    color: "white",
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    paddingLeft: 5,
  },
  taskList: {
    flex: 1,
    marginBottom: 10,
  },
  taskItem: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  completedTask: {
    backgroundColor: "#f8fff8",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskDetails: {
    flex: 1,
    marginLeft: 12,
  },
  taskText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: "line-through",
    color: "#777",
  },
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: "50%",
  },
  timeText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
  },
  noteText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointsBadge: {
    backgroundColor: "#e7f4ff",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    minWidth: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  pointsBadgeEnlarged: {
    transform: [{ scale: 1.2 }],
    backgroundColor: "#d1e9ff",
  },
  pointsInput: {
    color: "#2575fc",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: "#777",
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f9f9ff",
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  rewardCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rewardAvailable: {
    opacity: 1,
  },
  rewardLocked: {
    opacity: 0.6,
  },
  rewardIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  rewardCost: {
    backgroundColor: "#6a11cb",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  costText: {
    color: "white",
    fontWeight: "bold",
  },
  pointsDisplay: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e7f4ff",
    borderRadius: 15,
    alignItems: "center",
  },
  availablePoints: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2575fc",
  },
  plannerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  plannerModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "85%",
    alignItems: "center",
  },
  plannerModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 25,
    color: "#4a4e69",
    textAlign: "center",
  },
  plannerModalButton: {
    backgroundColor: "#6a11cb",
    borderRadius: 15,
    padding: 16,
    width: "100%",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dailyButton: {
    backgroundColor: "#3d5afe",
  },
  plannerButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  plannerModalButtonText: {
    fontSize: 18,
    color: "white",
    fontWeight: "600",
    marginLeft: 12,
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6c757d",
    fontWeight: "500",
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingBottom: 25,
    backgroundColor: "#f0f4ff",
  },
  rewardsButton: {
    backgroundColor: "white",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rewardsButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6a11cb",
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
  },
  floatingButtonText: {
    fontSize: 30,
    color: "white",
    lineHeight: 30,
  },
  taskModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  taskModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: "90%",
    maxWidth: 400,
  },
  taskModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    marginTop: 15,
  },
  modalInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  pointsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointsInput: {
    flex: 1,
    marginRight: 10,
  },
  pointsLabel: {
    fontSize: 16,
    color: "#6c757d",
  },
  timeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  timeSeparator: {
    marginHorizontal: 10,
    color: "#6c757d",
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#e9ecef",
  },
  addButton: {
    backgroundColor: "#6a11cb",
  },
  cancelButtonText: {
    color: "#495057",
    fontWeight: "bold",
    fontSize: 16,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  aiButton: {
    backgroundColor: "#6a11cb",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  aiButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
