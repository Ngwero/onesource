export type KitchenCollageImage = {
  url: string;
  alt: string;
  href: string;
};

export type KitchenCollage = {
  id: string;
  introTitle: string;
  introBody: string;
  images: KitchenCollageImage[];
  active: boolean;
  updatedAt?: string;
};
