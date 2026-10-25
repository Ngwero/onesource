import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";

type Props = {
  title?: string;
  body?: string;
};

export function NotFoundPage({ title, body }: Props) {
  const { t } = useTranslation();
  return (
    <PageContainer className="py-16 sm:py-20 text-center">
      <div className="card p-8 sm:p-12 max-w-md mx-auto">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">404</p>
        <h1 className="text-xl sm:text-2xl font-bold mt-2">
          {title ?? t("notFoundPage.title")}
        </h1>
        <p className="text-text-muted mt-3 leading-relaxed text-sm sm:text-base">
          {body ?? t("notFoundPage.body")}
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          {t("notFoundPage.home")}
        </Link>
      </div>
    </PageContainer>
  );
}
