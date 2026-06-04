function logCurrentDay() {
    const cells = document.querySelectorAll("#shattered-board-grid .shattered-board-cell");
    const idSet = new Set();

    cells.forEach(cell => {
        const styleString = cell.style.backgroundImage || "";
        const match = styleString.match(/\/([A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4})\./i);

        if (match && match[1]) {
            idSet.add(match[1].toUpperCase());
        }
    });

    const sortedIds = Array.from(idSet).sort();

    console.clear();
    if (sortedIds.length === 0) {
        console.error("No active fragments found on the grid.");
        return;
    }

    console.log(sortedIds.join("\n"));
}

logCurrentDay();