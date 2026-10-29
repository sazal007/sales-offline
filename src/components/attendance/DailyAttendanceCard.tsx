// src/components/attendance/DailyAttendanceCard.tsx

import {
  useAttendanceConfigQuery,
  useTodayAttendanceQuery,
} from "@/hooks/useAttendanceQueries";
import { PlusCircle, UserCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AttendanceModal } from "./AttendanceModal";

interface DailyAttendanceCardProps {
  userRole?: string;
}

export function DailyAttendanceCard({ userRole }: DailyAttendanceCardProps) {
  const isSalesPerson =
    userRole === "Offline_SalesPerson" || userRole === "SalesPerson";

  const { data: config } = useAttendanceConfigQuery(isSalesPerson);
  const { data: todayStatus, isLoading } =
    useTodayAttendanceQuery(isSalesPerson);

  const [modalVisible, setModalVisible] = useState(false);

  // Attendance is only for salesperson roles
  if (!isSalesPerson) {
    return null;
  }

  // If attendance is already posted today, do not show the section
  if (todayStatus?.attendance) {
    return null;
  }

  // While checking status, avoid layout flicker
  if (isLoading && todayStatus === undefined) {
    return null;
  }

  // Format cutoff time display (e.g. "12:00:00" -> "12:00 PM")
  const formattedCutoff = (() => {
    if (!config?.cutoff_time) return null;
    const [hours, minutes] = config.cutoff_time.split(":");
    const h = parseInt(hours, 10);
    const m = minutes || "00";
    if (isNaN(h)) return config.cutoff_time;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  })();

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        className="rounded-2xl border border-border bg-background p-4 shadow-sm active:opacity-85"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3 pr-2">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-soft">
              <UserCheck size={22} color="#e8452c" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-ink">
                Daily Attendance
              </Text>
              <Text className="mt-0.5 text-xs text-ink-soft">
                {formattedCutoff
                  ? `Mark present before ${formattedCutoff}`
                  : "Post attendance with selfie & GPS"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1.5 rounded-xl bg-brand px-3 py-2 shadow-sm">
            <PlusCircle size={13} color="#ffffff" strokeWidth={2.2} />
            <Text className="text-xs font-bold text-white">Mark Now</Text>
          </View>
        </View>
      </Pressable>

      {/* Attendance Submission Modal */}
      <AttendanceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}
