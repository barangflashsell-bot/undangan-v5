const { db } = require('../db');
const crypto = require('node:crypto');

// Simple secure session token store for admin
const adminSessions = new Set();

function createAdminSession() {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.add(token);
  return token;
}

function destroyAdminSession(token) {
  if (token) adminSessions.delete(token);
}

function adminAuth(req, res, next) {
  const token = req.cookies?.admin_token;
  if (token && adminSessions.has(token)) {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ success: false, error: 'Akses ditolak: Silakan login sebagai Admin.' });
  }
  return res.redirect('/admin/login');
}

// Tenant Ownership Middleware
function tenantAuth(req, res, next) {
  const managementToken = req.params.managementToken || req.headers['x-management-token'];
  if (!managementToken) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, error: 'Management Token tidak disertakan.' });
    }
    return res.status(404).send('Management Link tidak valid.');
  }

  const stmt = db.prepare('SELECT * FROM invitations WHERE management_token = ?');
  const invitation = stmt.get(managementToken);

  if (!invitation) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(404).json({ success: false, error: 'Management Link tidak valid atau tidak ditemukan.' });
    }
    return res.status(404).send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Link Tidak Ditemukan</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{font-family:sans-serif;text-align:center;padding:50px 20px;background:#f8fafc;color:#334155;}</style>
      </head><body>
      <h2>⚠️ Management Link Tidak Valid</h2>
      <p>Link pengelolaan undangan yang Anda buka salah atau sudah tidak berlaku.</p>
      </body></html>
    `);
  }

  if (invitation.is_active === 0) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ success: false, error: 'Undangan ini telah dinonaktifkan oleh Admin.' });
    }
    return res.status(403).send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Undangan Dinonaktifkan</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{font-family:sans-serif;text-align:center;padding:50px 20px;background:#f8fafc;color:#334155;}</style>
      </head><body>
      <h2>🔒 Undangan Dinonaktifkan</h2>
      <p>Undangan ini sedang dinonaktifkan sementara oleh Admin. Hubungi Admin untuk aktivasi kembali.</p>
      </body></html>
    `);
  }

  // Bind invitation to req
  req.invitation = invitation;
  next();
}

// Guest Resolver
function guestResolver(req, res, next) {
  const { slug, guestToken } = req.params;

  const invStmt = db.prepare('SELECT * FROM invitations WHERE slug = ?');
  const invitation = invStmt.get(slug);

  if (!invitation) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Undangan Tidak Ditemukan</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{font-family:sans-serif;text-align:center;padding:50px 20px;background:#f8fafc;color:#334155;}</style>
      </head><body>
      <h2>⚠️ Undangan Tidak Ditemukan</h2>
      <p>Halaman undangan yang Anda tuju tidak ditemukan.</p>
      </body></html>
    `);
  }

  if (invitation.is_active === 0) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Undangan Dinonaktifkan</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{font-family:sans-serif;text-align:center;padding:50px 20px;background:#f8fafc;color:#334155;}</style>
      </head><body>
      <h2>🔒 Undangan Dinonaktifkan</h2>
      <p>Undangan ini sedang tidak aktif. Silakan hubungi tuan rumah.</p>
      </body></html>
    `);
  }

  let guest = null;
  if (guestToken) {
    const guestStmt = db.prepare('SELECT * FROM guests WHERE invitation_id = ? AND guest_token = ?');
    guest = guestStmt.get(invitation.id, guestToken);
  }

  req.invitation = invitation;
  req.guest = guest || {
    id: null,
    guest_token: guestToken || 'publik',
    name: 'Tamu Undangan',
    category: 'Tamu Terhormat',
    attendance_status: 'pending',
    total_pax: 1
  };
  next();
}

module.exports = {
  adminAuth,
  createAdminSession,
  destroyAdminSession,
  tenantAuth,
  guestResolver
};
