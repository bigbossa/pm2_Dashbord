// middlewares/auth.js
function authGuard(req, res, next) {
  // ตรวจสอบ cookie ก่อน (ใหม่) จากนั้น session (เก่า)
  if (req.user || req.session?.user) return next();

  const wantsJson = req.path.startsWith("/api/") || req.headers.accept?.includes("application/json");

  if (wantsJson) {
    return res.status(401).json({ ok: false, detail: "UNAUTHORIZED" });
  } else {
    return res.redirect("login");
  }
}

module.exports = { authGuard };
