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