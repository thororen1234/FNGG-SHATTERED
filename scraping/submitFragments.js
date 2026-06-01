const fragments = [];
async function submitFragments() {
    const input = document.getElementById("shattered-board-input");
    const form = document.getElementById("shattered-board-form");
    let submitted = 0, skipped = 0;

    for (const id of fragments) {
        input.value = id;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        submitted++;
        console.log(`[${submitted}/${fragments.length}] Submitted: ${id}`);
        await new Promise(r => setTimeout(r, 0));
    }

    console.log(`Done! ${submitted} submitted, ${skipped} skipped.`);
}

submitFragments();

(() => {
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
        console.error("No active fragments found on the grid. Verify that the 'Community Board' tab layout is selected and visible on your screen!");
        return;
    }

    console.log(sortedIds.join("\n"));
})();