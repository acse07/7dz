import { useEffect, useState } from 'react';
import type { SubmitEvent } from 'react';

const API = 'https://inai-col1.fishrungames.com';
const LIMIT = 12;
// Старые объявления, которые убрали с этого сайта. Новые публикации будут видны.
const HIDDEN_IDS = [1, 2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 18, 19];

type Ad = {
  id: number;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
};

type AdsResponse = {
  items: Ad[];
  total: number;
  page: number;
  limit: number;
};

export default function App() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [sending, setSending] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');

  // GET: загружаем объявления и убираем скрытые записи.
  async function loadAds(signal?: AbortSignal) {
    setLoading(true);
    setListError('');
    try {
      const items: Ad[] = [];
      let requestPage = 1;
      let total = 0;
      do {
        const response = await fetch(`${API}/ads?page=${requestPage}&limit=100`, { signal });
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data: AdsResponse = await response.json();
        items.push(...data.items);
        total = data.total;
        requestPage++;
        if (data.items.length === 0) break;
      } while (items.length < total);
      const visibleAds = items.filter(ad => !HIDDEN_IDS.includes(ad.id));
      setAds(visibleAds);
      setPage(current => Math.min(current, Math.max(1, Math.ceil(visibleAds.length / LIMIT))));
    } catch {
      if (!signal?.aborted) setListError('Не удалось загрузить объявления. Попробуйте ещё раз.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadAds(controller.signal);
    return () => controller.abort();
  }, []);

  // POST: FormData передаёт текстовые поля и выбранное изображение.
  async function submitAd(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title')).trim();
    const description = String(formData.get('description')).trim();
    const price = Number(formData.get('price'));
    setFormMessage('');
    setFormError('');

    if (!title || !description || !Number.isFinite(price) || price < 0) {
      setFormError('Заполните название, описание и укажите цену от 0.');
      return;
    }

    formData.set('title', title);
    formData.set('description', description);
    const image = formData.get('image');
    if (image instanceof File && image.size === 0) formData.delete('image');

    setSending(true);
    try {
      // Content-Type не задаём: браузер сам добавит границу multipart/form-data.
      const response = await fetch(`${API}/ads`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Ошибка отправки');
      const created: Ad = await response.json();
      form.reset();
      setFormMessage(`Объявление «${created.title}» опубликовано!`);
      setPage(1);
      await loadAds();
    } catch {
      setFormError('Не удалось отправить объявление. Проверьте соединение и попробуйте снова.');
    } finally {
      setSending(false);
    }
  }

  const pages = Math.max(1, Math.ceil(ads.length / LIMIT));
  const pageAds = ads.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <main>
      <header>
        <h1>Доска объявлений</h1>
        <p>Найдите нужную вещь или разместите своё объявление.</p>
      </header>

      <section aria-labelledby="form-title">
        <h2 id="form-title">Добавить объявление</h2>
        <form onSubmit={submitAd}>
          <fieldset disabled={sending}>
            <label>Название<input name="title" required maxLength={200} /></label>
            <label>Описание<textarea name="description" required rows={3} maxLength={5000} /></label>
            <label>Цена (сом)<input name="price" type="number" min="0" step="0.01" required /></label>
            <label>Фото (необязательно)<input name="image" type="file" accept="image/*" /></label>
            <button type="submit">{sending ? 'Отправка…' : 'Опубликовать'}</button>
          </fieldset>
          {formError && <p role="alert" className="error">{formError}</p>}
          {formMessage && <p role="status" className="success">{formMessage}</p>}
        </form>
      </section>

      <section aria-labelledby="ads-title">
        <div className="list-heading">
          <h2 id="ads-title">Объявления ({ads.length})</h2>
          <button disabled={loading || sending} onClick={() => void loadAds()}>Обновить</button>
        </div>
        {loading ? <p role="status">Загрузка объявлений…</p> : listError ? (
          <p role="alert" className="error">{listError}</p>
        ) : ads.length === 0 ? <p>Объявлений пока нет. Добавьте первое!</p> : (
          <div className="ads">
            {pageAds.map(ad => (
              <article key={ad.id}>
                {ad.image_url ? (
                  <img src={new URL(ad.image_url, API).href} alt={ad.title} loading="lazy" />
                ) : <div className="no-photo">Без фото</div>}
                <h3>{ad.title}</h3>
                <p className="description">{ad.description}</p>
                <strong>{ad.price.toLocaleString('ru-RU')} сом</strong>
              </article>
            ))}
          </div>
        )}
        {pages > 1 && <nav aria-label="Страницы объявлений">
          <button disabled={page === 1 || loading || sending} onClick={() => setPage(page - 1)}>Назад</button>
          <span>Страница {page} из {pages}</span>
          <button disabled={page >= pages || loading || sending} onClick={() => setPage(page + 1)}>Далее</button>
        </nav>}
      </section>
      <footer>Учебный проект · React + TypeScript</footer>
    </main>
  );
}
