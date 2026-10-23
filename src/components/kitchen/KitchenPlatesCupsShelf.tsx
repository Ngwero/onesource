import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchProductListPage } from '../../api/client';
import { uniquePreviewProducts } from '../../utils/uniquePreviewProducts';
import type { Product } from '../../types/product';
import { KitchenAisleCarousel } from './KitchenAisleCarousel';
import { KitchenShelfSkeleton } from './KitchenShelfSkeleton';

export function KitchenPlatesCupsShelf({ onProducts }: { onProducts: (products: Product[]) => void }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const title = t('kitchen.home.platesCupsTitle', { defaultValue: 'Plates & Cups' });
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(['plates', 'cups'].map(q => fetchProductListPage(
      {shop:'kitchen', aisle:'tabletop', q}, 0, 12, controller.signal,
    ))).then(([plates, cups]) => {
      if (controller.signal.aborted) return;
      const mixed = Array.from({length:12}, (_,i) => [plates.products[i], cups.products[i]])
        .flat().filter((product): product is Product => Boolean(product));
      const selected = uniquePreviewProducts(mixed);
      setProducts(selected);
      onProducts(selected);
      setStatus('ready');
    }).catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt, onProducts]);
  if (status === 'loading') return <KitchenShelfSkeleton title={title} />;
  if (status === 'error') return <section className="kitchen-ikea-row">
    <h2 className="kitchen-ikea-row-title">{title}</h2>
    <button className="btn-primary mt-3" onClick={() => {setStatus('loading');setAttempt(n=>n+1);}}>
      {t('common.retry', {defaultValue:'Retry'})}
    </button>
  </section>;
  return <KitchenAisleCarousel title={title} products={products}
    seeMoreHref="/kitchen/search?q=plates%20and%20cups" hideTabs preserveOrder />;
}
