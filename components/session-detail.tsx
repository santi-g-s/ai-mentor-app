"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Tag,
  MessageSquareText,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface SessionData {
  id: string;
  timestamp: string;
  transcript: string;
  profile: string;
  duration: number;
  status: string;
  tags: string[];
  title: string;
}

interface SessionDetailProps {
  id: string | Promise<string>;
}

export function SessionDetail({ id }: SessionDetailProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Resolve the ID when it changes
  useEffect(() => {
    async function resolveId() {
      try {
        const resolvedId = await Promise.resolve(id);
        setSessionId(resolvedId);
      } catch (error) {
        console.error("Error resolving session ID:", error);
        setError("Invalid session ID");
        setLoading(false);
      }
    }

    resolveId();
  }, [id]);

  // Fetch session details once we have the ID
  useEffect(() => {
    async function fetchSessionDetails() {
      if (!sessionId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/sessions/${sessionId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.data) {
          setSession(data.data);
        } else {
          setError("Session not found");
        }
      } catch (error) {
        console.error("Error fetching session details:", error);
        setError("Failed to load session details");
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  const handleDelete = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Session deleted",
        description: "Session has been successfully deleted",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMMM d, yyyy");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "h:mm a");
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Loading session details...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error || "Session not found"}</p>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mt-4"
        >
          Go back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">Session Details</h1>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-red-500">
              <Trash2 className="h-5 w-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Session</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this session? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="mx-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{session.title}</CardTitle>
          <CardDescription>
            <div className="flex flex-wrap gap-2 mt-1">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDate(session.timestamp)}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-1" />
                <span>{formatTime(session.timestamp)}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-1" />
                <span>{formatDuration(session.duration)}</span>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Mentor
              </h3>
              <p>{session.profile}</p>
            </div>

            {session.tags && session.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {session.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="h-3 w-3 mr-1 text-muted-foreground text-bold" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mx-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <MessageSquareText className="h-5 w-5 mr-2" />
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-line text-sm">
            {session.transcript ? (
              session.transcript
            ) : (
              <p className="text-muted-foreground">No transcript available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
