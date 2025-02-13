/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{html,js}"],
	theme: {
		extend: {
			colors: {
				darkbg: "#212121",
				darkprimary: "#303030",
				lightprimary: "#c4cad4",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
			},
			animation: {
				fadeIn: "fadeIn 0.3s ease-in-out",
			},
		},
	},
	plugins: [],
};
