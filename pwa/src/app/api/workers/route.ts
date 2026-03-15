import { NextResponse } from 'next/server';

interface TopWorker {
  name: string;
  rating: number;
  jobs_count: number;
  is_vip: boolean;
  skills: string;
}

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!sheetId || !apiKey) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const range = 'Workers!A2:N500';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();
    const rows: string[][] = data.values ?? [];

    const workers: TopWorker[] = rows
      .filter((row) => row[6] === 'TRUE')
      .filter((row) => {
        if (!row[11]) return true;
        const banDate = new Date(row[11]);
        return !isNaN(banDate.getTime()) && banDate < new Date();
      })
      .map((row) => ({
        name: row[2] || row[1] || 'Исполнитель',
        rating: parseFloat(row[4]) || 5.0,
        jobs_count: parseInt(row[5], 10) || 0,
        is_vip: row[7] === 'TRUE',
        skills: row[9] || '',
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20);

    return NextResponse.json(workers);
  } catch (error) {
    console.error('GET /api/workers error:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки исполнителей' },
      { status: 500 }
    );
  }
}
