import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchProductListPage } from '../../api/client';
import { excludePreviewProducts, uniquePreviewProducts } from '../../utils/uniquePreviewProducts';
import type { Product } from '../../types/product';
import { KitchenAisleCarousel } from './KitchenAisleCarousel';
import { KitchenShelfSkeleton } from './KitchenShelfSkeleton';

const SHELF_SIZE = 24;

export function KitchenPlatesCupsShelf({ onProducts }: { onProducts: (products: Product[]) => void }) {
  const { t } = useTranslation();
  const [plates, setPlates] = useState<Product[]>([]);
  const [cups, setCups] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const platesTitle = t('kitchen.home.platesTitle', { defaultValue: 'Plates' });
  const cupsTitle = t('kitchen.home.cupsTitle', { defaultValue: 'Cups' });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      (['plates', 'cups'] as const).map((q) =>
        fetchProductListPage({ shop: 'kitchen', aisle: 'tabletop', q }, 0, SHELF_SIZE, controller.signal),
      ),
    )
      .then(([platesPage, cupsPage]) => {
        if (controller.signal.aborted) return;
        const plateRow = uniquePreviewProducts(platesPage.products);
        const cupRow = uniquePreviewProducts(excludePreviewProducts(cupsPage.products, plateRow));
        setPlates(plateRow);
        setCups(cupRow);
        onProducts([...plateRow, ...cupRow]);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [attempt, onProducts]);

  const retry = () => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  };

  if (status === 'loading') {
    return (
      <>
        <KitchenShelfSkeleton title={platesTitle} />
        <KitchenShelfSkeleton title={cupsTitle} />
      </>
    );
  }

  if (status === 'error') {
    return (
      <section className="kitchen-ikea-row">
        <h2 className="kitchen-ikea-row-title">{platesTitle}</h2>
        <button className="btn-primary mt-3" onClick={retry}>
          {t('common.retry', { defaultValue: 'Retry' })}
        </button>
      </section>
    );
  }

  return (
    <>
      <KitchenAisleCarousel
        title={platesTitle}
        products={plates}
        seeMoreHref="/kitchen/search?q=plates"
        hideTabs
        preserveOrder
      />
      <KitchenAisleCarousel
        title={cupsTitle}
        products={cups}
        seeMoreHref="/kitchen/search?q=cups"
        hideTabs
        preserveOrder
      />
    </>
  );
}
