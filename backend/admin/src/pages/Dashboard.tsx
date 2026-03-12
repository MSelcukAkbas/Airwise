import React, { useState } from 'react';

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ token, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>SmokePace Admin Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </nav>

      <div className="sidebar">
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={activeTab === 'tasks' ? 'active' : ''}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button
          className={activeTab === 'notifications' ? 'active' : ''}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
      </div>

      <main className="content">
        {activeTab === 'users' && <UsersSection />}
        {activeTab === 'tasks' && <TasksSection />}
        {activeTab === 'analytics' && <AnalyticsSection />}
        {activeTab === 'notifications' && <NotificationsSection />}
      </main>
    </div>
  );
}

function UsersSection() {
  return (
    <section>
      <h2>Users Management</h2>
      <p>Users list coming soon...</p>
    </section>
  );
}

function TasksSection() {
  return (
    <section>
      <h2>Tasks Management</h2>
      <p>Create, edit, delete tasks and set difficulty levels</p>
    </section>
  );
}

function AnalyticsSection() {
  return (
    <section>
      <h2>Analytics</h2>
      <p>Crisis hours, heatmaps, and relapse trends graphs</p>
    </section>
  );
}

function NotificationsSection() {
  return (
    <section>
      <h2>Push Notifications</h2>
      <p>Send targeted notifications to users</p>
    </section>
  );
}
