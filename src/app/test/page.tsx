"use client";
import { useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function updateUserRole() {
    setLoading(true);
    try {
      const response = await fetch("/api/users/update-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "2", role: "collector" })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Error: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  async function testRegistration() {
    setLoading(true);
    try {
      const testData = {
        name: "Test Collector",
        email: "testcollector@example.com",
        password: "testpass123",
        address: "Test Address",
        role: "collector"
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData)
      });
      
      const data = await response.json();
      setResult("Registration result: " + JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Error: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Test User Role Functions</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={updateUserRole}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update User #2 to Collector"}
          </button>

          <button
            onClick={testRegistration}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 ml-4"
          >
            {loading ? "Testing..." : "Test Collector Registration"}
          </button>
        </div>

        {result && (
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Result:</h2>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
//comment to check git status