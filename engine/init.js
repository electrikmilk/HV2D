const version = "1.0.0";
let readyMessage = "HV-Engine (" + version + ") ready";

console.time(readyMessage);

let resources = {
	"styles": ["main", "ui"],
	"frameworks": ["jquery", "jquery-ui", "mousetrap", "mousetrap-pause"],
	"general": ["engine"],
	"project": ["project"]
};

async function sleep(s) {
	s = s * 1000;
	return new Promise(resolve => setTimeout(resolve, s));
}

function make_id(length = 6) {
	let result = "";
	let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() *
			charactersLength));
	}
	return result;
}

/* Load resources */

const head = document.querySelector("head");
let timeout = 1000;
for (var group in resources) {
	resources[group].forEach(function (resource) {
		let element;
		if (group === "styles") {
			element = document.createElement("link");
			element.rel = "stylesheet";
			timeout = 0;
		} else {
			element = document.createElement("script");
			element.type = "text/javascript";
			element.async = true;
			timeout = timeout + 500;
		}
		if (group === "frameworks") {
			element.src = "engine/" + group + "/" + resource + ".min.js";
		} else if (group === "plugins") {
			element.src = "engine/" + group + "/" + resource + ".plugin.js";
		} else if (group === "styles") {
			element.href = "engine/" + group + "/" + resource + ".css";
		} else if (group === "project") {
			element.src = "project.js";
		} else {
			element.src = "engine/" + resource + ".js";
		}
		setTimeout(function () {
			head.appendChild(element);
		}, timeout);
	});
}