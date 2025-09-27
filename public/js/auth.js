// // /static/js/auth.js

// export async function login(email, password) {
//   try {
//     const res = await fetch("http://127.0.0.1:8000/auth/login", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({ username: email, password }),
//     });

//     if (!res.ok) {
//       throw new Error("Email e/ou senha inválidos!");
//     }

//     const data = await res.json();
//     const token = data.access_token;
//     localStorage.setItem("access_token", token);

//     const payload = JSON.parse(atob(token.split(".")[1]));

//     // Atualiza Alpine store
//     Alpine.store("app").role = payload.role;
//     Alpine.store("app").menus = payload.menus;
//     Alpine.store("app").hotels = payload.hotels;
//     Alpine.store("app").currentView = "dashboard";

//   } catch (e) {
//     console.error("Erro no login:", e);
//     throw e;
//   }
// }