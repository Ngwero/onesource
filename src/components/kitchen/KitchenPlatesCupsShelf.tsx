import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchProductListPage } from '../../api/client';
import { uniquePreviewProducts } from '../../utils/uniquePreviewProducts';
import type { Product } from '../../types/product';
import { KitchenAisleCarousel } from './KitchenAisleCarousel';
import { KitchenShelfSkeleton } from './KitchenShelfSkeleton';

const SHELF_SIZE = 24;

export function KitchenPlatesCupsShelf({
  exclude = [],
  onClaim,
}: {
  exclude?: Product[];
  onClaim: (key: string, products: Product[]) => void;
}) {
  const { t } = useTranslation();
  const [platesRaw, setPlatesRaw] = useState<Product[]>([]);
  const [cupsRaw, setCupsRaw] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const platesTitle = t('kitchen.home.platesTitle', { defaultValue: 'Plates' });
  const cupsTitle = t('kitchen.home.cupsTitle', { defaultValue: 'Cups' });
  const plates = useMemo(
    () => uniquePreviewProducts(platesRaw, exclude),
    [platesRaw, exclude],
  );
  const cups = useMemo(
    () => uniquePreviewProducts(cupsRaw, [...exclude, ...plates]),
    [cupsRaw, exclude, plates],
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      (['plates', 'cups'] as const).map((q) =>
        fetchProductListPage({ shop: 'kitchen', aisle: 'tabletop', q }, 0, SHELF_SIZE, controller.signal),
      ),
    )
      .then(([platesPage, cupsPage]) => {
        if (controller.signal.aborted) return;
        setPlatesRaw(platesPage.products);
        setCupsRaw(cupsPage.products);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (status !== 'ready') return;
    onClaim('plates', plates);
    onClaim('cups', cups);
  }, [status, plates, cups, onClaim]);

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
      <section className="w-full min-w-0">
        <h2 className="section-title text-xl sm:text-2xl">{platesTitle}</h2>
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
