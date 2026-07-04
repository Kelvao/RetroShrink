function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

shuffle(PLATFORMS);

const element = document.getElementById("platform-name");
let index = 0;

function nextPlatform() {
    element.classList.add("slide-out");

    setTimeout(() => {
        index++;

        if (index >= PLATFORMS.length) {
            shuffle(PLATFORMS);
            index = 0;
        }

        element.classList.remove("slide-out");
        element.classList.add("slide-in");
        element.textContent = PLATFORMS[index].name;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.classList.remove("slide-in");
            });
        });
    }, 300);
}

setInterval(nextPlatform, 2500);