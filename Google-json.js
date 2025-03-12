document.addEventListener("DOMContentLoaded", async () => {
    await loadData();
});

async function loadData() {
    try {
        const response = await fetch("http://localhost:3001/read-sheet");
        const result = await response.json();
        
        if (result.status === "success") {
            const tableBody = document.getElementById("dataTableBody");
            tableBody.innerHTML = "";

            result.data.forEach(row => {
                const [timestamp, name, , date, , , position] = row;

                if (date.trim() !== "") { // Solo mostrar si tiene fecha en "Date"
                    const tr = document.createElement("tr");
                    tr.innerHTML = `<td>${timestamp}</td>
                                    <td>${name}</td>
                                    <td>${position}</td>`;
                    tr.setAttribute("data-name", name);
                    tableBody.appendChild(tr);
                }
            });
        }
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

document.getElementById("createProfileBtn").addEventListener("click", async () => {
    const selectedRow = document.querySelector("#dataTableBody tr.selected");
    
    if (!selectedRow) {
        alert("Please select a user.");
        return;
    }

    const selectedName = selectedRow.getAttribute("data-name");

    try {
        // Obtener los datos del usuario seleccionado
        const userResponse = await fetch(`http://localhost:3001/get-user-data?name=${selectedName}`);
        const userResult = await userResponse.json();

        if (userResult.status === "success") {
            const userData = userResult.data;

            // Subir a Firebase
            await fetch("http://localhost:3001/upload-to-firebase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData)
            });

            // Borrar la fecha en Google Sheets
            await fetch("http://localhost:3001/update-date", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: selectedName })
            });

            // Eliminar visualmente de la tabla
            selectedRow.remove();
            alert("Profile Created and removed from the list.");
        }
    } catch (error) {
        console.error("Error in Create Profile:", error);
    }
});

// Filtro de búsqueda
function filterTable() {
    const searchValue = document.getElementById("searchBox").value.toLowerCase();
    const rows = document.querySelectorAll("#dataTableBody tr");

    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        row.style.display = name.includes(searchValue) ? "" : "none";
    });
}

// Selección de filas
document.getElementById("dataTableBody").addEventListener("click", (event) => {
    document.querySelectorAll("#dataTableBody tr").forEach(row => row.classList.remove("selected"));
    event.target.parentElement.classList.add("selected");
});
