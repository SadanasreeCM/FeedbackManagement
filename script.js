const API_URL = "http://localhost:3000/complaints";
let allComplaints = [];
let currentFilter = "all";
let currentUser = null;

// Initialize
document.addEventListener("DOMContentLoaded", function() {
    checkAuth();
    loadComplaints();
    setupEventListeners();
    setupCharCounter();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (token && user) {
        currentUser = user;
        showUserMenu(user);
    } else {
        showAuthLinks();
    }
}

// Show user menu
function showUserMenu(user) {
    document.getElementById('authLinks').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('userGreeting').textContent = `Hello, ${user.username}`;

    if (user.role === 'admin') {
        document.getElementById('dashboardLink').style.display = 'inline';
    }
}

// Show auth links
function showAuthLinks() {
    document.getElementById('authLinks').style.display = 'flex';
    document.getElementById('userMenu').style.display = 'none';
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showAuthLinks();
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById("complaintForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        if (!currentUser) {
            showToast("Please login to submit feedback", "error");
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
        await submitComplaint();
    });

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            currentFilter = this.dataset.filter;
            displayComplaints();
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Character counter for textarea
function setupCharCounter() {
    const textarea = document.getElementById("message");
    const charCount = document.getElementById("charCount");

    textarea.addEventListener("input", function() {
        charCount.textContent = this.value.length;
        if (this.value.length > 500) {
            this.value = this.value.substring(0, 500);
            charCount.textContent = 500;
        }
    });
}

// Submit Complaint
async function submitComplaint() {
    const complaint = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        category: document.getElementById("category").value,
        message: document.getElementById("message").value.trim()
    };

    // Validation
    if (!complaint.name || !complaint.email || !complaint.category || !complaint.message) {
        showToast("Please fill in all fields", "error");
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(complaint)
        });

        if (response.ok) {
            showToast("✓ Feedback submitted successfully!", "success");
            document.getElementById("complaintForm").reset();
            document.getElementById("charCount").textContent = "0";
            loadComplaints();

            // Scroll to complaints section
            setTimeout(() => {
                document.getElementById("complaints").scrollIntoView({ behavior: "smooth" });
            }, 500);
        } else if (response.status === 401) {
            showToast("Please login to submit feedback", "error");
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showToast("Error submitting feedback. Please try again.", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Connection error. Please check your server.", "error");
    }
}

// Load Complaints
async function loadComplaints() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            // Show message to login to view complaints
            document.getElementById("complaintList").innerHTML = '<div class="login-prompt"><p>Please <a href="login.html">login</a> to view complaints</p></div>';
            document.getElementById("noComplaints").style.display = "none";
            return;
        }

        const res = await fetch(API_URL, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.ok) {
            allComplaints = await res.json();
            displayComplaints();
        } else if (res.status === 401) {
            // Token expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            checkAuth();
            showToast("Session expired. Please login again.", "error");
        } else {
            console.error("Failed to load complaints");
            showToast("Could not load feedback. Please refresh the page.", "error");
        }
    } catch (error) {
        console.error("Error loading complaints:", error);
        showToast("Could not load feedback. Please refresh the page.", "error");
    }
}

// Display Complaints with filtering
function displayComplaints() {
    const complaintList = document.getElementById("complaintList");
    const noComplaints = document.getElementById("noComplaints");

    let filtered = allComplaints;

    if (currentFilter !== "all") {
        filtered = allComplaints.filter(c => c.category === currentFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    complaintList.innerHTML = "";

    if (filtered.length === 0) {
        noComplaints.style.display = "block";
        return;
    }

    noComplaints.style.display = "none";

    filtered.forEach((complaint, index) => {
        const card = createComplaintCard(complaint, index);
        complaintList.appendChild(card);
    });
}

// Create Complaint Card
function createComplaintCard(complaint, index) {
    const card = document.createElement("div");
    card.className = "complaint-card";
    card.style.animation = `fadeIn 0.6s ease ${index * 0.1}s both`;

    const date = new Date(complaint.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    const status = complaint.status || "Open";
    const categoryIcon = getCategoryIcon(complaint.category);

    card.innerHTML = `
        <div class="complaint-header">
            <div>
                <div class="complaint-name">${escapeHtml(complaint.name)}</div>
                <div class="complaint-email">${escapeHtml(complaint.email)}</div>
            </div>
            <span class="complaint-category ${complaint.category}">${categoryIcon} ${complaint.category}</span>
        </div>
        <div class="complaint-message">"${escapeHtml(complaint.message)}"</div>
        <div class="complaint-footer">
            <span>${date}</span>
            <span class="status-badge ${status}">${status}</span>
        </div>
    `;

    return card;
}

// Get Category Icon
function getCategoryIcon(category) {
    const icons = {
        "Technical": "🔧",
        "Service": "🎯",
        "Billing": "💳",
        "General": "📝"
    };
    return icons[category] || "📝";
}

// Escape HTML to prevent XSS
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

// Toast Notification
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
