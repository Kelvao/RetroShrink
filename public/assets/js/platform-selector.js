const select = document.getElementById("platform");

const placeholder = document.createElement("option");
placeholder.value = "";
placeholder.textContent = "Selecione a Plataforma";
placeholder.disabled = true;
placeholder.selected = true;
select.appendChild(placeholder);

const groups = {};
const groupOrder = ["Sony", "Sega", "Nintendo", "Others"];

groupOrder.forEach(group => {
    groups[group] = [];
});

for (const platform of PLATFORMS) {
    if (!groups[platform.group]) {
        groups[platform.group] = [];
    }
    groups[platform.group].push(platform);
}

for (const groupName of groupOrder) {
    if (groups[groupName] && groups[groupName].length > 0) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = groupName;

        for (const platform of groups[groupName]) {
            const option = document.createElement("option");
            option.value = platform.value;
            option.textContent = platform.name;
            optgroup.appendChild(option);
        }

        select.appendChild(optgroup);
    }
}