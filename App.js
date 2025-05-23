import React, { useState, useEffect } from 'react';

import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';

import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

import { db, auth, appId, firebaseConfig, initialAuthToken } from './firebaseConfig';

import './App.css'; //Do NOT forget to import CSS file

export default function App() {

  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUserId(user ? user.uid : crypto.randomUUID());
        setIsAuthReady(true);
      });
      return () => unsubscribe();
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const todosCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/todos`);
    const q = query(todosCollectionRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTodos(todosList);
      setLoading(false);
    }, (err) => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthReady, db, userId, appId]);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!db || !userId || !newTodoText.trim()) return;
    setLoading(true);
    await addDoc(collection(db, `artifacts/${appId}/users/${userId}/todos`), {
      text: newTodoText.trim(), completed: false, createdAt: new Date(),
    });
    setNewTodoText('');
    setLoading(false);
  };

  const toggleTodoComplete = async (id, currentCompletedStatus) => {
    if (!db || !userId) return;
    setLoading(true);
    await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/todos`, id), {
      completed: !currentCompletedStatus
    });
    setLoading(false);
  };

  const updateTodoText = async (id) => {
    if (!db || !userId || !editingTodoText.trim()) return;
    setLoading(true);
    await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/todos`, id), {
      text: editingTodoText.trim()
    });
    setEditingTodoId(null);
    setEditingTodoText('');
    setLoading(false);
  };

  const deleteTodo = async (id) => {
    if (!db || !userId) return;
    setLoading(true);
    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/todos`, id));
    setLoading(false);
    
  };

  return (
    <div className="app-container">
      <h1>To-Do List</h1>
      <p>Welcome To The Simplest To-Do List In The World. </p>

      <form onSubmit={addTodo} className="add-todo-form">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="Pick grandma up from bingo night..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newTodoText.trim()}>Add</button>
      </form>

      <ul className="todo-list">
        {todos.length === 0 && !loading ? (
          <p className="no-todos-message">There's alot to do today, let's get started.</p>
        ) : (
          todos.map((todo) => (
            <li key={todo.id} className="todo-item">
              {editingTodoId === todo.id ? (
                <input
                  type="text"
                  value={editingTodoText}
                  onChange={(e) => setEditingTodoText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateTodoText(todo.id);
                    }
                  }}
                  disabled={loading}
                  className="edit-input"
                />
              ) : (
                <span
                  className={todo.completed ? 'completed' : ''}
                  onClick={() => toggleTodoComplete(todo.id, todo.completed)}
                >
                  {todo.text}
                </span>
              )}
              <div className="btn-group">
                {editingTodoId === todo.id ? (
                  <button className="save-btn" onClick={() => updateTodoText(todo.id)} disabled={loading}>
                    Save
                  </button>
                ) : (
                  <button
                    className="edit-btn"
                    onClick={() => {
                      setEditingTodoId(todo.id);
                      setEditingTodoText(todo.text);
                    }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                )}
                <button className="delete-btn" onClick={() => deleteTodo(todo.id)} disabled={loading}>
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
