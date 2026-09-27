const STORAGE_KEYS = {
    theme: "ai_project_theme"
};

function saveSetting(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getSetting(key, defaultValue = null) {
    const value = localStorage.getItem(key);

    if (value === null) {
        return defaultValue;
    }

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function removeSetting(key) {
    localStorage.removeItem(key);
}

function saveTheme(theme) {
    saveSetting(STORAGE_KEYS.theme, theme);
}

function loadTheme() {
    return getSetting(STORAGE_KEYS.theme, "light");
}

function applyTheme() {
    const theme = loadTheme();

    document.body.classList.toggle("dark", theme === "dark");

    const button = document.getElementById("themeBtn");

    if (button) {
        button.textContent = theme === "dark" ? "☀️" : "🌙";
    }
}

function toggleTheme() {
    const current = loadTheme();
    const next = current === "dark" ? "light" : "dark";

    saveTheme(next);
    applyTheme();
}

function downloadJSON(data, filename = "ai-project-management-backup.json") {
    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

function downloadCSV(data, filename) {
    if (!data || !data.length) {
        alert("Tidak ada data untuk diekspor.");
        return;
    }

    const headers = Object.keys(data[0]);

    const rows = data.map(item => {
        return headers.map(header => {
            let value = item[header];

            if (value === null || value === undefined) {
                value = "";
            }

            value = String(value).replace(/"/g, '""');

            return `"${value}"`;
        }).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}