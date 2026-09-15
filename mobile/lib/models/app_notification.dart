class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.href = '',
    this.image,
    this.audience = 'all',
    this.active = true,
    this.createdAt,
  });

  final String id;
  final String title;
  final String body;
  final String href;
  final String? image;
  final String audience;
  final bool active;
  final DateTime? createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    DateTime? created;
    final raw = json['createdAt'] ?? json['created_at'];
    if (raw is String && raw.isNotEmpty) {
      created = DateTime.tryParse(raw);
    }
    return AppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      href: json['href']?.toString() ?? '',
      image: json['image']?.toString(),
      audience: json['audience']?.toString() ?? 'all',
      active: json['active'] != false,
      createdAt: created,
    );
  }
}
