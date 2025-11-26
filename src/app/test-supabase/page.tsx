"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface TestItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function TestSupabase() {
  const [status, setStatus] = useState<{
    connection: boolean;
    readTest: boolean;
    writeTest: boolean;
    error: string | null;
  }>({
    connection: false,
    readTest: false,
    writeTest: false,
    error: null,
  });

  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    testConnection();
    loadTestItems();
  }, []);

  const testConnection = async () => {
    try {
      const { error } = await supabase.from("test_items").select("*").limit(1);
      
      if (error) {
        if (error.code === "PGRST116" || error.message.includes("relation") || error.message.includes("does not exist")) {
          setStatus((prev) => ({
            ...prev,
            connection: true,
            error: "Connection works, but 'test_items' table doesn't exist.",
          }));
        } else {
          throw error;
        }
      } else {
        setStatus((prev) => ({
          ...prev,
          connection: true,
          readTest: true,
          error: null,
        }));
      }
    } catch (err) {
      const error = err as Error;
      setStatus((prev) => ({
        ...prev,
        connection: false,
        error: error.message || "Failed to connect to Supabase",
      }));
    }
  };

  const loadTestItems = async () => {
    try {
      const { data, error } = await supabase
        .from("test_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTestItems(data || []);
      setStatus((prev) => ({ ...prev, readTest: true }));
    } catch {
      // Table might not exist yet, that's okay
    }
  };

  const addTestItem = async () => {
    if (!newItemName.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_items")
        .insert([{ 
          name: newItemName, 
          description: newItemDescription.trim() || null 
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTestItems([data, ...testItems]);
      setNewItemName("");
      setNewItemDescription("");
      setStatus((prev) => ({ ...prev, writeTest: true }));
    } catch (err) {
      const error = err as Error;
      setStatus((prev) => ({
        ...prev,
        error: error.message || "Failed to insert item",
      }));
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (item: TestItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingDescription(item.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingDescription("");
  };

  const updateTestItem = async (id: string) => {
    if (!editingName.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_items")
        .update({ 
          name: editingName, 
          description: editingDescription.trim() || null 
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setTestItems(testItems.map((item) => (item.id === id ? data : item)));
      cancelEditing();
    } catch (err) {
      const error = err as Error;
      setStatus((prev) => ({
        ...prev,
        error: error.message || "Failed to update item",
      }));
    } finally {
      setLoading(false);
    }
  };

  const deleteTestItem = async (id: string) => {
    try {
      const { error } = await supabase.from("test_items").delete().eq("id", id);
      if (error) throw error;
      setTestItems(testItems.filter((item) => item.id !== id));
    } catch (err) {
      const error = err as Error;
      setStatus((prev) => ({
        ...prev,
        error: error.message || "Failed to delete item",
      }));
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white dark:bg-black">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-4xl font-light text-gray-900 dark:text-white text-center">
          Supabase Connection Test
        </h1>

        <div className="space-y-6">
          {/* Connection Test */}
          <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Supabase Connection
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status.connection
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {status.connection ? "✓ Connected" : "✗ Failed"}
              </span>
            </div>
          </div>

          {/* Read Test */}
          {status.connection && (
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Read Test (SELECT)
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.readTest
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {status.readTest ? "✓ Working" : "⏳ Testing..."}
                </span>
              </div>
            </div>
          )}

          {/* Write Test */}
          {status.connection && (
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Write Test (INSERT)
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.writeTest
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {status.writeTest ? "✓ Working" : "⏳ Not tested"}
                </span>
              </div>
            </div>
          )}

          {/* CRUD Test Interface */}
          {status.connection && status.readTest && (
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Test CRUD Operations
              </h2>
              
              {/* Add Item Form */}
              <div className="space-y-2 mb-6">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter item name..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                  onKeyPress={(e) => e.key === "Enter" && addTestItem()}
                />
                <input
                  type="text"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Enter description (optional)..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                  onKeyPress={(e) => e.key === "Enter" && addTestItem()}
                />
                <button
                  onClick={addTestItem}
                  disabled={loading || !newItemName.trim()}
                  className="w-full px-6 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Adding..." : "Add"}
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Items ({testItems.length})
                </h3>
                {testItems.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No items found. Add one above or check if the table exists.
                  </p>
                ) : (
                  testItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                    >
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                            placeholder="Description (optional)"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateTestItem(item.id)}
                              disabled={loading || !editingName.trim()}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={loading}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => startEditing(item)}
                              className="px-3 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTestItem(item.id)}
                              className="px-3 py-1 text-xs rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

