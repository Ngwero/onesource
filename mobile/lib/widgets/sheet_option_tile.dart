import 'package:flutter/material.dart';

import '../config/theme.dart';

/// One option in a language, currency, or country sheet.
///
/// Horizontal and vertical padding live inside the [InkWell], so the whole
/// visible row — including the space beside the label — is one tap target
/// at least 48px tall, with a ripple. Rows are flush, with no dead gap.
class SheetOptionTile extends StatelessWidget {
  const SheetOptionTile({
    super.key,
    required this.leading,
    required this.title,
    this.subtitle,
    this.titleWeight = FontWeight.w700,
    required this.selected,
    required this.onTap,
  });

  final Widget leading;
  final String title;
  final String? subtitle;
  final FontWeight titleWeight;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = subtitle == null ? title : '$title, $subtitle';
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        excludeFromSemantics: true,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: [
                leading,
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: titleWeight,
                          fontSize: 16,
                          color: AppColors.text,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.25,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (selected) ...[
                  const SizedBox(width: 8),
                  const Icon(Icons.check_circle, color: AppColors.darkGreen),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
