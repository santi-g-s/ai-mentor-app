"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// Define types for our session data
interface DbSession {
  id: string;
  timestamp: string;
  transcript: string | null;
  profile: string;
  duration: number | null;
  status: string;
  tags: string[] | null;
  title: string;
}

interface FormattedSession {
  id: string;
  date: string;
  time: string;
  topic: string;
  duration: string;
  profile: string;
  timestamp: Date;
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sessions, setSessions] = useState<FormattedSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sessions from Supabase
  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const response = await fetch("/api/sessions");
        const data = await response.json();

        if (data.data) {
          // Filter to only include 'complete' sessions
          const completedSessions = data.data
            .filter((session: DbSession) => session.status === "complete")
            .map((session: DbSession) => ({
              id: session.id,
              date: formatDate(new Date(session.timestamp)),
              time: formatTime(new Date(session.timestamp)),
              topic: session.title || "Recent Session",
              duration: `${Math.ceil((session.duration || 0) / 60)} min`,
              profile: session.profile,
              timestamp: new Date(session.timestamp),
            }));

          setSessions(completedSessions);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  // Helper function to format date
  const formatDate = (date: Date): string => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Helper function to format time
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Mock data
  const actionItems = [
    { id: 1, text: "Practice time management techniques", completed: false },
    { id: 2, text: "Create a prioritized task list", completed: true },
    { id: 3, text: "Identify tasks to delegate", completed: false },
    { id: 4, text: "Schedule focused work blocks", completed: false },
  ];

  const stats = {
    sessionsCompleted: sessions.length,
    actionsCompleted: 8,
    totalActions: 15,
    weeklyProgress: 65,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress and upcoming actions
        </p>
      </div>

      <Tabs
        defaultValue="overview"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Weekly Goal</span>
                    <span className="text-sm font-medium">
                      {stats.weeklyProgress}%
                    </span>
                  </div>
                  <Progress value={stats.weeklyProgress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">
                      {stats.sessionsCompleted}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Sessions
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">
                      {stats.actionsCompleted}/{stats.totalActions}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Actions
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-4 text-center text-muted-foreground">
                  Loading sessions...
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.slice(0, 2).map((session) => (
                    <div
                      key={session.id}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{session.topic}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{session.date}</span>
                          <Clock className="h-3 w-3 ml-2 mr-1" />
                          <span>{session.duration}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  No completed sessions yet
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setActiveTab("history")}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Action Items</CardTitle>
              <CardDescription>
                Tasks recommended by your AI mentor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 py-2 border-b last:border-0"
                  >
                    <CheckCircle2
                      className={`h-5 w-5 mt-0.5 ${
                        item.completed
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`${
                          item.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-4 text-center text-muted-foreground">
                  Loading sessions...
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{session.topic}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{session.date}</span>
                          <Clock className="h-3 w-3 ml-2 mr-1" />
                          <span>{session.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-muted-foreground mr-2">
                          {session.duration}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  No completed sessions yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
