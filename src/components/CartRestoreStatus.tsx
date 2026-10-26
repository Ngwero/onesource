import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { PageContainer } from './PageContainer';
import { BrandLoader } from './BrandLoader';

export function CartRestoreStatus() {
  const { t } = useTranslation();
  const { restoreError, retryRestore } = useCart();
  return <PageContainer className="py-16 text-center">
    {restoreError ? <>
      <p role="alert">{t('cart.restoreFailed', { defaultValue: 'We could not load your saved basket. Your items are still saved.' })}</p>
      <button onClick={retryRestore} className="btn-primary mt-4">{t('common.retry')}</button>
    </> : <div role="status" className="flex justify-center"><BrandLoader size={72} /></div>}
  </PageContainer>;
}
