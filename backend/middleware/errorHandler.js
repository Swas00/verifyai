// Express 5 forwards async-handler rejections here automatically.
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : err.name === "MulterError" ? 400 : 500);
  res.status(status).json({ error: err.message || "Internal server error" });
}

module.exports = errorHandler;
