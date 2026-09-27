let projects = [];
let tasks = [];
let team = [];
let expenses = [];

document.addEventListener("DOMContentLoaded", async () => {
    setupNavigation();
    setupForms();
    applyTheme();

    document.getElementById("themeBtn").addEventListener("click", toggleTheme);

    await loadAllData();
    refreshUI();
});

function setupNavigation() {
    document.querySelectorAll(".nav-btn").forEach(button => {
        button.addEventListener("click", () => {
            showPage(button.dataset.page);
        });
    });
}

function showPage(pageName) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active");
    });

    const page = document.getElementById(pageName);
    const button = document.querySelector(`[data-page="${pageName}"]`);

    if (page) {
        page.classList.add("active");
    }

    if (button) {
        button.classList.add("active");
    }

    refreshUI();
}

async function loadAllData() {
    projects = await getAllData(STORES.projects);
    tasks = await getAllData(STORES.tasks);
    team = await getAllData(STORES.team);
    expenses = await getAllData(STORES.expenses);
}

function refreshUI() {
    updateDashboard();
    renderProjects();
    renderTasks();
    renderTeam();
    renderFinance();
    renderReports();
}

function setupForms() {
    document.getElementById("projectForm").addEventListener("submit", saveProject);
    document.getElementById("taskForm").addEventListener("submit", saveTask);
    document.getElementById("teamForm").addEventListener("submit", saveTeam);
    document.getElementById("expenseForm").addEventListener("submit", saveExpense);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getProjectName(projectId) {
    const project = projects.find(item => Number(item.id) === Number(projectId));
    return project ? project.name : "Tanpa Proyek";
}

function getMemberName(memberId) {
    const member = team.find(item => Number(item.id) === Number(memberId));
    return member ? member.name : "Belum ditentukan";
}

function calculateProjectProgress(projectId) {
    const projectTasks = tasks.filter(
        task => Number(task.projectId) === Number(projectId)
    );

    if (!projectTasks.length) {
        return 0;
    }

    const completed = projectTasks.filter(
        task => task.status === "Selesai"
    ).length;

    return Math.round((completed / projectTasks.length) * 100);
}

function isOverdue(date, status) {
    if (!date || status === "Selesai") {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(date + "T00:00:00");

    return deadline < today;
}

function formatDate(date) {
    if (!date) return "-";

    return new Date(date + "T00:00:00").toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function updateDashboard() {
    const completedTasks = tasks.filter(t => t.status === "Selesai").length;

    const activeProjects = projects.filter(
        p => p.status === "Berjalan"
    ).length;

    const overdueTasks = tasks.filter(
        t => isOverdue(t.deadline, t.status)
    ).length;

    const totalExpenses = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
    );

    document.getElementById("totalProjects").textContent = projects.length;
    document.getElementById("totalTasks").textContent = tasks.length;
    document.getElementById("activeProjects").textContent = activeProjects;
    document.getElementById("completedTasks").textContent = completedTasks;
    document.getElementById("overdueTasks").textContent = overdueTasks;
    document.getElementById("totalExpenses").textContent = formatCurrency(totalExpenses);

    const recentProjects = [...projects]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 5);

    const recentContainer = document.getElementById("recentProjects");

    if (!recentProjects.length) {
        recentContainer.innerHTML = `<div class="empty">Belum ada proyek.</div>`;
    } else {
        recentContainer.innerHTML = recentProjects.map(project => {
            const progress = calculateProjectProgress(project.id);

            return `
                <div class="list-item">
                    <strong>${escapeHTML(project.name)}</strong>
                    <small>${escapeHTML(project.status)} • Progress ${progress}%</small>
                </div>
            `;
        }).join("");
    }

    const upcoming = [...tasks]
        .filter(task => task.status !== "Selesai")
        .sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        })
        .slice(0, 5);

    const upcomingContainer = document.getElementById("upcomingTasks");

    if (!upcoming.length) {
        upcomingContainer.innerHTML = `<div class="empty">Tidak ada tugas mendatang.</div>`;
    } else {
        upcomingContainer.innerHTML = upcoming.map(task => `
            <div class="list-item">
                <strong>${escapeHTML(task.name)}</strong>
                <small>
                    ${escapeHTML(getProjectName(task.projectId))}
                    • ${formatDate(task.deadline)}
                </small>
            </div>
        `).join("");
    }
}

function renderProjects() {
    const container = document.getElementById("projectsList");
    if (!container) return;

    const search = (document.getElementById("projectSearch")?.value || "")
        .toLowerCase();

    const status = document.getElementById("projectStatusFilter")?.value || "";

    const filtered = projects.filter(project => {
        const matchesSearch =
            project.name.toLowerCase().includes(search) ||
            (project.description || "").toLowerCase().includes(search);

        const matchesStatus =
            !status || project.status === status;

        return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
        container.innerHTML = `<div class="empty">Belum ada proyek yang sesuai.</div>`;
        return;
    }

    container.innerHTML = filtered.map(project => {
        const progress = calculateProjectProgress(project.id);

        const statusClass =
            project.status === "Selesai"
                ? "success"
                : project.status === "Ditunda"
                    ? "danger"
                    : project.status === "Berjalan"
                        ? "warning"
                        : "";

        return `
            <div class="project-card">
                <h3>📁 ${escapeHTML(project.name)}</h3>

                <p>${escapeHTML(
                    project.description || "Tidak ada deskripsi."
                )}</p>

                <div class="badges">
                    <span class="badge ${statusClass}">
                        ${escapeHTML(project.status)}
                    </span>

                    <span class="badge">
                        Prioritas ${escapeHTML(project.priority)}
                    </span>
                </div>

                <small>
                    Deadline: ${formatDate(project.deadline)}
                </small>

                <div class="progress">
                    <div class="progress-bar" style="width:${progress}%"></div>
                </div>

                <small>Progress ${progress}%</small>

                <div class="card-actions">
                    <button class="small-btn" onclick="editProject(${project.id})">Edit</button>
                    <button class="small-btn delete" onclick="deleteProject(${project.id})">Hapus</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderTasks() {
    const container = document.getElementById("tasksList");
    if (!container) return;

    const search = (document.getElementById("taskSearch")?.value || "")
        .toLowerCase();

    const status = document.getElementById("taskStatusFilter")?.value || "";

    const filtered = tasks.filter(task => {
        const matchesSearch =
            task.name.toLowerCase().includes(search) ||
            getProjectName(task.projectId).toLowerCase().includes(search);

        const matchesStatus =
            !status || task.status === status;

        return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
        container.innerHTML = `<div class="empty">Belum ada tugas yang sesuai.</div>`;
        return;
    }

    const sorted = [...filtered].sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
    });

    container.innerHTML = sorted.map(task => {
        const overdue = isOverdue(task.deadline, task.status);

        return `
            <div class="task-row">
                <div>
                    <h3>📋 ${escapeHTML(task.name)}</h3>
                    <small>
                        ${escapeHTML(getProjectName(task.projectId))}
                        • ${escapeHTML(getMemberName(task.assignee))}
                    </small>
                </div>

                <span class="badge ${task.status === "Selesai" ? "success" : ""}">
                    ${escapeHTML(task.status)}
                </span>

                <span class="badge ${overdue ? "danger" : ""}">
                    ${overdue ? "⚠️ Terlambat" : "📅 " + formatDate(task.deadline)}
                </span>

                <div class="actions">
                    <button class="small-btn" onclick="editTask(${task.id})">Edit</button>
                    <button class="small-btn delete" onclick="deleteTask(${task.id})">Hapus</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderTeam() {
    const container = document.getElementById("teamList");
    if (!container) return;

    if (!team.length) {
        container.innerHTML = `<div class="empty">Belum ada anggota tim.</div>`;
        return;
    }

    container.innerHTML = team.map(member => {
        const initials = member.name
            .split(" ")
            .map(word => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        const assignedTasks = tasks.filter(
            task => Number(task.assignee) === Number(member.id)
        ).length;

        return `
            <div class="project-card member-card">
                <div class="member-avatar">${escapeHTML(initials)}</div>
                <h3>${escapeHTML(member.name)}</h3>
                <p>${escapeHTML(member.role || "Anggota Tim")}</p>
                <small>${escapeHTML(member.contact || "Tidak ada kontak")}</small>

                <div class="badges">
                    <span class="badge">
                        ${assignedTasks} tugas
                    </span>
                </div>

                <div class="card-actions">
                    <button class="small-btn" onclick="editTeam(${member.id})">Edit</button>
                    <button class="small-btn delete" onclick="deleteTeam(${member.id})">Hapus</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderFinance() {
    const budget = projects.reduce(
        (sum, project) => sum + Number(project.budget || 0),
        0
    );

    const expense = expenses.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
    );

    document.getElementById("financeBudget").textContent = formatCurrency(budget);
    document.getElementById("financeExpense").textContent = formatCurrency(expense);
    document.getElementById("financeRemaining").textContent = formatCurrency(budget - expense);

    const container = document.getElementById("expensesList");

    if (!expenses.length) {
        container.innerHTML = `<div class="empty">Belum ada pengeluaran.</div>`;
        return;
    }

    const sorted = [...expenses].sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
    );

    container.innerHTML = sorted.map(item => `
        <div class="expense-row">
            <div>
                <strong>${escapeHTML(item.description)}</strong>
                <small>
                    ${escapeHTML(getProjectName(item.projectId))}
                    • ${formatDate(item.date)}
                </small>
            </div>

            <div>
                <strong>${formatCurrency(item.amount)}</strong>
                <button class="small-btn delete" onclick="deleteExpense(${item.id})">
                    Hapus
                </button>
            </div>
        </div>
    `).join("");
}

function renderReports() {
    const completed = tasks.filter(t => t.status === "Selesai").length;

    const overdue = tasks.filter(
        t => isOverdue(t.deadline, t.status)
    ).length;

    document.getElementById("reportProjects").textContent = projects.length;
    document.getElementById("reportTasks").textContent = tasks.length;
    document.getElementById("reportCompleted").textContent = completed;
    document.getElementById("reportOverdue").textContent = overdue;

    const container = document.getElementById("projectProgressReport");

    if (!projects.length) {
        container.innerHTML = `<div class="empty">Belum ada proyek.</div>`;
        return;
    }

    container.innerHTML = projects.map(project => {
        const progress = calculateProjectProgress(project.id);

        return `
            <div class="progress-report">
                <div class="progress-report-header">
                    <strong>${escapeHTML(project.name)}</strong>
                    <span>${progress}%</span>
                </div>

                <div class="progress">
                    <div class="progress-bar" style="width:${progress}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function openModal(id) {
    document.getElementById(id).classList.add("show");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

function openProjectModal(project = null) {
    const form = document.getElementById("projectForm");
    form.reset();

    document.getElementById("projectId").value = "";
    document.getElementById("projectModalTitle").textContent =
        project ? "Edit Proyek" : "Tambah Proyek";

    if (project) {
        document.getElementById("projectId").value = project.id;
        document.getElementById("projectName").value = project.name;
        document.getElementById("projectDescription").value = project.description || "";
        document.getElementById("projectStatus").value = project.status;
        document.getElementById("projectPriority").value = project.priority;
        document.getElementById("projectDeadline").value = project.deadline || "";
        document.getElementById("projectBudget").value = project.budget || 0;
    }

    openModal("projectModal");
}

async function saveProject(event) {
    event.preventDefault();

    const id = document.getElementById("projectId").value;

    const data = {
        name: document.getElementById("projectName").value.trim(),
        description: document.getElementById("projectDescription").value.trim(),
        status: document.getElementById("projectStatus").value,
        priority: document.getElementById("projectPriority").value,
        deadline: document.getElementById("projectDeadline").value,
        budget: Number(document.getElementById("projectBudget").value) || 0
    };

    if (id) {
        data.id = Number(id);
        await updateData(STORES.projects, data);
    } else {
        data.createdAt = new Date().toISOString();
        await addData(STORES.projects, data);
    }

    await loadAllData();
    closeModal("projectModal");
    refreshUI();
}

function editProject(id) {
    const project = projects.find(item => Number(item.id) === Number(id));

    if (project) {
        openProjectModal(project);
    }
}

async function deleteProject(id) {
    const hasTasks = tasks.some(
        task => Number(task.projectId) === Number(id)
    );

    if (hasTasks) {
        alert("Proyek tidak dapat dihapus karena masih memiliki tugas.");
        return;
    }

    if (!confirm("Hapus proyek ini?")) return;

    await deleteData(STORES.projects, id);
    await loadAllData();
    refreshUI();
}

function populateTaskSelects() {
    const projectSelect = document.getElementById("taskProject");
    const assigneeSelect = document.getElementById("taskAssignee");

    projectSelect.innerHTML =
        `<option value="">Tanpa Proyek</option>` +
        projects.map(project =>
            `<option value="${project.id}">${escapeHTML(project.name)}</option>`
        ).join("");

    assigneeSelect.innerHTML =
        `<option value="">Belum ditentukan</option>` +
        team.map(member =>
            `<option value="${member.id}">${escapeHTML(member.name)}</option>`
        ).join("");
}

function openTaskModal(task = null) {
    populateTaskSelects();

    document.getElementById("taskForm").reset();
    document.getElementById("taskId").value = "";

    document.getElementById("taskModalTitle").textContent =
        task ? "Edit Tugas" : "Tambah Tugas";

    if (task) {
        document.getElementById("taskId").value = task.id;
        document.getElementById("taskName").value = task.name;
        document.getElementById("taskProject").value = task.projectId || "";
        document.getElementById("taskAssignee").value = task.assignee || "";
        document.getElementById("taskStatus").value = task.status;
        document.getElementById("taskPriority").value = task.priority;
        document.getElementById("taskDeadline").value = task.deadline || "";
        document.getElementById("taskNotes").value = task.notes || "";
    }

    openModal("taskModal");
}

async function saveTask(event) {
    event.preventDefault();

    const id = document.getElementById("taskId").value;

    const data = {
        name: document.getElementById("taskName").value.trim(),
        projectId: document.getElementById("taskProject").value
            ? Number(document.getElementById("taskProject").value)
            : null,
        assignee: document.getElementById("taskAssignee").value
            ? Number(document.getElementById("taskAssignee").value)
            : null,
        status: document.getElementById("taskStatus").value,
        priority: document.getElementById("taskPriority").value,
        deadline: document.getElementById("taskDeadline").value,
        notes: document.getElementById("taskNotes").value.trim()
    };

    if (id) {
        data.id = Number(id);
        await updateData(STORES.tasks, data);
    } else {
        data.createdAt = new Date().toISOString();
        await addData(STORES.tasks, data);
    }

    await loadAllData();
    closeModal("taskModal");
    refreshUI();
}

function editTask(id) {
    const task = tasks.find(item => Number(item.id) === Number(id));

    if (task) {
        openTaskModal(task);
    }
}

async function deleteTask(id) {
    if (!confirm("Hapus tugas ini?")) return;

    await deleteData(STORES.tasks, id);
    await loadAllData();
    refreshUI();
}

function openTeamModal(member = null) {
    document.getElementById("teamForm").reset();
    document.getElementById("teamId").value = "";

    if (member) {
        document.getElementById("teamId").value = member.id;
        document.getElementById("teamName").value = member.name;
        document.getElementById("teamRole").value = member.role || "";
        document.getElementById("teamContact").value = member.contact || "";
    }

    openModal("teamModal");
}

async function saveTeam(event) {
    event.preventDefault();

    const id = document.getElementById("teamId").value;

    const data = {
        name: document.getElementById("teamName").value.trim(),
        role: document.getElementById("teamRole").value.trim(),
        contact: document.getElementById("teamContact").value.trim()
    };

    if (id) {
        data.id = Number(id);
        await updateData(STORES.team, data);
    } else {
        await addData(STORES.team, data);
    }

    await loadAllData();
    closeModal("teamModal");
    refreshUI();
}

function editTeam(id) {
    const member = team.find(item => Number(item.id) === Number(id));

    if (member) {
        openTeamModal(member);
    }
}

async function deleteTeam(id) {
    const assigned = tasks.some(
        task => Number(task.assignee) === Number(id)
    );

    if (assigned) {
        alert("Anggota tidak dapat dihapus karena masih memiliki tugas.");
        return;
    }

    if (!confirm("Hapus anggota ini?")) return;

    await deleteData(STORES.team, id);
    await loadAllData();
    refreshUI();
}

function populateExpenseProjects() {
    const select = document.getElementById("expenseProject");

    select.innerHTML =
        `<option value="">Tanpa Proyek</option>` +
        projects.map(project =>
            `<option value="${project.id}">${escapeHTML(project.name)}</option>`
        ).join("");
}

function openExpenseModal() {
    populateExpenseProjects();

    document.getElementById("expenseForm").reset();
    document.getElementById("expenseDate").value =
        new Date().toISOString().split("T")[0];

    openModal("expenseModal");
}

async function saveExpense(event) {
    event.preventDefault();

    const data = {
        projectId: document.getElementById("expenseProject").value
            ? Number(document.getElementById("expenseProject").value)
            : null,
        description: document.getElementById("expenseDescription").value.trim(),
        amount: Number(document.getElementById("expenseAmount").value) || 0,
        date: document.getElementById("expenseDate").value
    };

    await addData(STORES.expenses, data);

    await loadAllData();
    closeModal("expenseModal");
    refreshUI();
}

async function deleteExpense(id) {
    if (!confirm("Hapus pengeluaran ini?")) return;

    await deleteData(STORES.expenses, id);
    await loadAllData();
    refreshUI();
}

function useAISuggestion(text) {
    document.getElementById("aiInput").value = text;
    sendAI();
}

function addAIMessage(text, type = "ai") {
    const container = document.getElementById("aiMessages");

    const message = document.createElement("div");
    message.className = type === "user"
        ? "user-message"
        : "ai-message";

    if (type === "ai") {
        message.innerHTML = `<strong>🤖 AI Assistant</strong><p>${text}</p>`;
    } else {
        message.textContent = text;
    }

    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
}

function sendAI() {
    const input = document.getElementById("aiInput");
    const question = input.value.trim();

    if (!question) return;

    addAIMessage(question, "user");
    input.value = "";

    const answer = generateAIResponse(question);
    addAIMessage(answer);
}

function generateAIResponse(question) {
    const q = question.toLowerCase();

    const activeProjects = projects.filter(
        project => project.status === "Berjalan"
    );

    const completed = tasks.filter(
        task => task.status === "Selesai"
    );

    const unfinished = tasks.filter(
        task => task.status !== "Selesai"
    );

    const overdue = tasks.filter(
        task => isOverdue(task.deadline, task.status)
    );

    if (
        q.includes("ringkas") ||
        q.includes("kondisi proyek") ||
        q.includes("ringkasan")
    ) {
        return `
            <strong>📊 Ringkasan Proyek</strong><br>
            Total proyek: <b>${projects.length}</b><br>
            Proyek berjalan: <b>${activeProjects.length}</b><br>
            Total tugas: <b>${tasks.length}</b><br>
            Tugas selesai: <b>${completed.length}</b><br>
            Tugas belum selesai: <b>${unfinished.length}</b><br>
            Tugas terlambat: <b>${overdue.length}</b>
        `;
    }

    if (
        q.includes("belum selesai") ||
        q.includes("belum dikerjakan")
    ) {
        if (!unfinished.length) {
            return "✅ Semua tugas sudah selesai.";
        }

        return `
            <strong>📋 Tugas Belum Selesai</strong><br><br>
            ${unfinished.map(task =>
                `• ${escapeHTML(task.name)} — ${escapeHTML(task.status)} — Deadline ${formatDate(task.deadline)}`
            ).join("<br>")}
        `;
    }

    if (
        q.includes("terlambat") ||
        q.includes("telat")
    ) {
        if (!overdue.length) {
            return "✅ Tidak ada tugas yang terlambat.";
        }

        return `
            <strong>⚠️ Tugas Terlambat</strong><br><br>
            ${overdue.map(task =>
                `• ${escapeHTML(task.name)} — Deadline ${formatDate(task.deadline)}`
            ).join("<br>")}
        `;
    }

    if (
        q.includes("rencana") ||
        q.includes("minggu ini")
    ) {
        const weeklyTasks = [...unfinished]
            .sort((a, b) =>
                (a.deadline || "9999").localeCompare(b.deadline || "9999")
            )
            .slice(0, 7);

        if (!weeklyTasks.length) {
            return "Tidak ada tugas yang perlu direncanakan saat ini.";
        }

        return `
            <strong>📅 Rencana Pekerjaan</strong><br><br>
            ${weeklyTasks.map((task, index) =>
                `${index + 1}. ${escapeHTML(task.name)} — ${formatDate(task.deadline)}`
            ).join("<br>")}
        `;
    }

    if (
        q.includes("proyek") &&
        (q.includes("berapa") || q.includes("jumlah"))
    ) {
        return `Saat ini terdapat <b>${projects.length}</b> proyek dalam sistem.`;
    }

    if (
        q.includes("tugas") &&
        (q.includes("berapa") || q.includes("jumlah"))
    ) {
        return `Saat ini terdapat <b>${tasks.length}</b> tugas dalam sistem.`;
    }

    if (
        q.includes("anggaran") ||
        q.includes("pengeluaran")
    ) {
        const budget = projects.reduce(
            (sum, project) => sum + Number(project.budget || 0),
            0
        );

        const expense = expenses.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0
        );

        return `
            <strong>💰 Kondisi Keuangan</strong><br>
            Total anggaran: <b>${formatCurrency(budget)}</b><br>
            Total pengeluaran: <b>${formatCurrency(expense)}</b><br>
            Sisa anggaran: <b>${formatCurrency(budget - expense)}</b>
        `;
    }

    return `
        Saya dapat membantu membaca data proyek Anda.
        <br><br>
        Coba perintah seperti:
        <br>• "Ringkas kondisi proyek saya"
        <br>• "Apa tugas yang belum selesai?"
        <br>• "Apa tugas yang terlambat?"
        <br>• "Buatkan rencana pekerjaan minggu ini"
        <br>• "Berapa total pengeluaran?"
    `;
}

window.addEventListener("click", event => {
    if (event.target.classList.contains("modal")) {
        event.target.classList.remove("show");
    }
});