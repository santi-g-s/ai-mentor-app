"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SupabaseSetupPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [sql, setSql] = useState("");
  const [errorDetails, setErrorDetails] = useState("");

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const response = await fetch("/api/setup-supabase");
        const data = await response.json();

        if (data.error) {
          setStatus("error");
          setMessage(data.message || "Error checking Supabase setup");
          setErrorDetails(data.error);
        } else {
          setStatus("success");
          setMessage(data.message);
          if (data.sql) {
            setSql(data.sql);
          }
        }
      } catch (error) {
        setStatus("error");
        setMessage("Failed to check Supabase setup");
        setErrorDetails(String(error));
      }
    };

    checkSupabase();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Supabase Setup Helper</h1>

      {status === "loading" ? (
        <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
      ) : status === "success" ? (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <p className="text-green-700">{message}</p>
          {sql && (
            <div className="mt-4">
              <p className="font-medium mb-2">
                Please run this SQL in your Supabase dashboard:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
                {sql}
              </pre>
              <p className="mt-2 text-sm">
                Go to{" "}
                <a
                  href="https://app.supabase.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Supabase Dashboard
                </a>{" "}
                → Your Project → SQL Editor → New Query → Paste the SQL above →
                Run
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{message}</p>
          {errorDetails && (
            <pre className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              {errorDetails}
            </pre>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link href="/">
          <Button>Return to Home</Button>
        </Link>
      </div>
    </div>
  );
}
