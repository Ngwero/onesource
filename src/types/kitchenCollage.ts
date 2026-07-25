export type KitchenCollageImage = {
  url: string;
  alt: string;
  href: string;
  /** Optional YouTube start offset in seconds (overrides ?t= / &start= in the URL). */
  startSeconds?: number | null;
};

export type KitchenCollage = {
  id: string;
  introTitle: string;
  introBody: string;
  images: KitchenCollageImage[];
  active: boolean;
  updatedAt?: string;
};
