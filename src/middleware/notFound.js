export const notFound = (req, res, next) => {
  res.status(404).json({
    ok: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    data: null,
  });
};
