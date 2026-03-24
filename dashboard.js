// Dashboard functionality
const API_BASE = "http://localhost:3000";
let allComplaints = [];
let currentFilter = "all";
let currentSentimentFilter = "all";
let categoryChart = null;
let sentimentChart = null;

// Get auth token
function getAuthToken() {
    return localStorage.getItem('token');
}

// Get user info
function getUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateStats(data);
            updateCategoryChart(data.categoryStats);
            updateSentimentChart(data.sentimentStats);
            displayRecentComplaints(data.recentComplaints);
        } else if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        } else {
            showToast('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Connection error', 'error');
    }
}

// Update statistics cards
function updateStats(data) {
    document.getElementById('totalComplaints').textContent = data.totalComplaints;
    document.getElementById('openComplaints').textContent = data.openComplaints;
    document.getElementById('resolvedComplaints').textContent = data.resolvedComplaints;
    document.getElementById('totalUsers').textContent = data.totalUsers;
}

// Update category chart
function updateCategoryChart(categoryStats) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    if (categoryChart) {
        categoryChart.destroy();
    }

    const labels = categoryStats.map(stat => stat._id);
    const data = categoryStats.map(stat => stat.count);

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#6366f1',
                    '#ec4899',
                    '#10b981',
                    '#ef4444',
                    '#f59e0b'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            }
        }
    });
}

// Update sentiment chart
function updateSentimentChart(sentimentStats) {
    const ctx = document.getElementById('sentimentChart');
    if (!ctx) return; // Chart doesn't exist on the page yet

    const ctxElement = ctx.getContext('2d');

    if (sentimentChart) {
        sentimentChart.destroy();
    }

    // Handle empty or undefined sentimentStats
    if (!sentimentStats || sentimentStats.length === 0) {
        sentimentStats = [];
    }

    const labels = sentimentStats.map(stat => stat._id);
    const data = sentimentStats.map(stat => stat.count);

    // Define colors for sentiment
    const colorMap = {
        'Positive': '#10b981',
        'Neutral': '#f59e0b',
        'Negative': '#ef4444'
    };

    const colors = labels.map(label => colorMap[label] || '#6366f1');

    sentimentChart = new Chart(ctxElement, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            }
        }
    });
}

// Display recent complaints
function displayRecentComplaints(complaints) {
    const container = document.getElementById('recentComplaintsList');
    container.innerHTML = '';

    if (complaints.length === 0) {
        container.innerHTML = '<p class="no-data">No recent complaints</p>';
        return;
    }

    complaints.forEach(complaint => {
        const date = new Date(complaint.date).toLocaleDateString();
        const card = document.createElement('div');
        card.className = 'complaint-row';
        card.innerHTML = `
            <div class="complaint-info">
                <strong>${escapeHtml(complaint.name)}</strong>
                <span class="category ${complaint.category}">${complaint.category}</span>
                <span class="sentiment sentiment-${complaint.sentiment?.toLowerCase() || 'neutral'}">${complaint.sentiment || 'Neutral'}</span>
            </div>
            <div class="complaint-message">${escapeHtml(complaint.message.substring(0, 100))}...</div>
            <div class="complaint-meta">
                <span>${date}</span>
                <span class="status-badge ${complaint.status}">${complaint.status}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Load all complaints for management
async function loadAllComplaints() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/complaints`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            allComplaints = await response.json();
            displayComplaints();
        } else {
            showToast('Failed to load complaints', 'error');
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
        showToast('Connection error', 'error');
    }
}

// Display complaints with filtering
function displayComplaints() {
    const container = document.getElementById('complaintsTable');
    let filtered = allComplaints;

    if (currentFilter !== "all") {
        filtered = filtered.filter(c => c.status === currentFilter);
    }

    if (currentSentimentFilter !== "all") {
        filtered = filtered.filter(c => c.sentiment === currentSentimentFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-data">No complaints found</p>';
        return;
    }

    filtered.forEach(complaint => {
        const date = new Date(complaint.date).toLocaleDateString();
        const row = document.createElement('div');
        row.className = 'complaint-row management-row';

        const statusOptions = ['Open', 'In Progress', 'Resolved'];
        const statusSelect = statusOptions.map(status =>
            `<option value="${status}" ${complaint.status === status ? 'selected' : ''}>${status}</option>`
        ).join('');

        row.innerHTML = `
            <div class="complaint-info">
                <strong>${escapeHtml(complaint.name)}</strong>
                <span class="email">${escapeHtml(complaint.email)}</span>
                <span class="category ${complaint.category}">${complaint.category}</span>
                <span class="sentiment sentiment-${complaint.sentiment?.toLowerCase() || 'neutral'}">${complaint.sentiment || 'Neutral'}</span>
            </div>
            <div class="complaint-message">${escapeHtml(complaint.message)}</div>
            <div class="complaint-actions">
                <select class="status-select" data-id="${complaint._id}">
                    ${statusSelect}
                </select>
                <span class="date">${date}</span>
            </div>
        `;
        container.appendChild(row);
    });

    // Add event listeners for status changes
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', updateComplaintStatus);
    });
}

// Update complaint status
async function updateComplaintStatus(e) {
    const complaintId = e.target.dataset.id;
    const newStatus = e.target.value;

    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/complaints/${complaintId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showToast('Status updated successfully', 'success');
            loadDashboardData(); // Refresh stats
            loadAllComplaints(); // Refresh complaints list
        } else {
            showToast('Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Connection error', 'error');
    }
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Toast notification
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = getUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Load data
    loadDashboardData();
    loadAllComplaints();

    // Setup filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            displayComplaints();
        });
    });

    // Setup sentiment filter buttons
    document.querySelectorAll('.sentiment-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sentiment-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSentimentFilter = this.dataset.sentiment;
            displayComplaints();
        });
    });

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
});