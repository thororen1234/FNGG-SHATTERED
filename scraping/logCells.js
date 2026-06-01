function logCells() {
    console.clear();

    for (let i = 1; i <= 6; i++) {
        const key = `fngg_shattered_${i}`;
        const data = localStorage.getItem(key);

        if (data) {
            try {
                const parsed = JSON.parse(data);
                const ids = Object.keys(parsed);
                if (ids.length > 0) {
                    console.log(`Day ${i} (${ids.length} fragments):\n`);
                    console.log(ids.join("\n"));
                } else {
                    console.log(`Day ${i}:\n`);
                    console.log(data);
                }
            } catch (e) {
                console.log(`Day ${i}:\n`);
                console.log(data);
            }
        } else {
            console.log(`Day ${i}: No data found`);
        }
    }
}

logCells();