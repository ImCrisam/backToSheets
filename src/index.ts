// src/index.ts
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import expressPkg, { Request, Response } from 'express';

let credentials: any;
if (process.env.NODE_ENV === 'production') {
  credentials = {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
  };
} else {
  credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
}
interface Item {
  id: string | number;
  description: string;
  rank: number; // 1..5
}

interface Body {
  name: string;
  items: Item[];
}

const app = expressPkg();
app.use(bodyParser.json());

// Configuración de Google Sheets
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES
});
const sheetsApi = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1FpoSpUEj9YB_A-47mMDMfokdpv400Mb9mscKuWRwoDQ';
const SHEET_NAME = process.env.SHEET_NAME || 'Hoja 1';

app.post('/items', async (req: Request, res: Response) => {
  const { name, items } = req.body;
  if (typeof name !== 'string' || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Body inválido' });
  }

  const values = items.map(item => [
    name,
    item.id,
    item.description,
    item.rank
  ]);

  try {
    await sheetsApi.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });
    res.status(200).json({ message: 'Datos guardados correctamente' });
  } catch (err) {
    console.error('Error al guardar en Sheets:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
