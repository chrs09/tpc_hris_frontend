import React, { useState, useEffect } from "react";
import { getDashboardSummary } from "../../api/dashboard";

const StatCard = ({ title, value, color }) => {
  return (
    <div className="bg-[#023047] rounded-2xl p-6 shadow-md border border-white/10 hover:shadow-lg transition hover:border-amber-500 hover:border-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-blue-100">{title}</p>
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
      </div>
      <h2 className="text-3xl font-bold text-white">{value}</h2>
    </div>
  );
};

const DashboardHome = () => {
  const [stats, setStats] = useState({
    total_employees: 0,
    present: 0,
    absent: 0,
    on_leave: 0,
  });

  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getDashboardSummary();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const attendanceRate =
    stats.total_employees > 0
      ? Math.round((stats.present / stats.total_employees) * 100)
      : 0;

  const alertMessage =
    attendanceRate < 60
      ? "⚠️ Attendance is critically low today."
      : attendanceRate < 80
      ? "⚠️ Attendance below average."
      : "✅ Attendance rate is healthy.";

  // ===============================
  // Bible Verse Rotation (Daily)
  // ===============================

  const bibleVerses = [
    {
      text: "Commit your work to the Lord, and your plans will be established.",
      reference: "Proverbs 16:3",
    },
    {
      text: "Whatever you do, work at it with all your heart.",
      reference: "Colossians 3:23",
    },
    {
      text: "The Lord will bless all the work of your hands.",
      reference: "Deuteronomy 28:12",
    },
    {
      text: "Let all that you do be done in love.",
      reference: "1 Corinthians 16:14",
    },
    {
      text: "Trust in the Lord with all your heart.",
      reference: "Proverbs 3:5",
    },
    {
      text: "The plans of the diligent lead surely to abundance.",
      reference: "Proverbs 21:5",
    },
  ];

  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const verseIndex = getDayOfYear() % bibleVerses.length;
  const verseOfTheDay = bibleVerses[verseIndex];

  if (loading) {
    return (
      <div className="p-8 text-gray-500 text-sm">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      {/* HERO SECTION */}
      <div className="rounded-3xl p-8 mb-10 text-white bg-[#023047] shadow-lg border border-white/10">
        <div className="flex justify-between flex-wrap gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()} 👋
            </h1>

            <p className="text-blue-100">{today}</p>

            <p className="mt-3 text-blue-100 text-sm">
              Monitor workforce activity and attendance in real-time.
            </p>

            {/* Divider */}
            <div className="w-16 h-[2px] bg-white/30 my-6"></div>

            {/* Bible Verse */}
            <div>
              <p className="italic text-blue-50 text-sm leading-relaxed">
                “{verseOfTheDay.text}”
              </p>
              <p className="mt-2 text-xs text-blue-200">
                — {verseOfTheDay.reference}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-blue-200">Current Time</p>
            <p className="text-2xl font-semibold">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* MAIN STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Total Employees"
          value={stats.total_employees}
          color="bg-blue-400"
        />
        <StatCard
          title="Present"
          value={stats.present}
          color="bg-green-400"
        />
        <StatCard
          title="Absent"
          value={stats.absent}
          color="bg-red-400"
        />
        <StatCard
          title="On Leave"
          value={stats.on_leave}
          color="bg-yellow-300"
        />
      </div>

      {/* ATTENDANCE PERFORMANCE */}
      <div className="bg-[#023047] rounded-3xl p-8 shadow-md border border-white/10 mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Attendance Performance
          </h3>
          <span className="text-sm text-blue-100">
            {attendanceRate}% Today
          </span>
        </div>

        <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
          <div
            className={`h-3 ${
              attendanceRate >= 80
                ? "bg-green-400"
                : attendanceRate >= 60
                ? "bg-yellow-300"
                : "bg-red-400"
            }`}
            style={{ width: `${attendanceRate}%` }}
          ></div>
        </div>

        <p className="mt-4 text-sm text-blue-100">
          {alertMessage}
        </p>
      </div>

      {/* QUICK INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#023047] rounded-3xl p-6 shadow-md border border-white/10">
          <h4 className="text-lg font-semibold text-white mb-4">
            Daily Snapshot
          </h4>
          <ul className="text-sm text-blue-100 space-y-2">
            <li>• Employees monitored: {stats.total_employees}</li>
            <li>• Active workforce: {stats.present}</li>
            <li>• Total not present: {stats.absent + stats.on_leave}</li>
          </ul>
        </div>

        <div className="bg-[#023047] rounded-3xl p-6 shadow-md border border-white/10">
          <h4 className="text-lg font-semibold text-white mb-4">
            System Status
          </h4>
          <ul className="text-sm text-blue-100 space-y-2">
            <li>• Attendance Module: Active</li>
            <li>• API Connection: Stable</li>
            <li>• Data Sync: Real-time</li>
          </ul>
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;