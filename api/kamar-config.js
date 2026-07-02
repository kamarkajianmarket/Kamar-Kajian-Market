module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    supabaseUrl: process.env.KAMAR_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.KAMAR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  });
};
