export const uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype;

    res.json({ ok: true, message: "File uploaded", data: { fileUrl, fileType } });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
};
