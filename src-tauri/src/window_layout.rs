use tauri::PhysicalSize;

// Sizes from the config are logical pixels; monitor work areas are physical pixels.
pub fn fitted_sizes(
    work: PhysicalSize<u32>,
    frame: PhysicalSize<u32>,
    scale: f64,
) -> (PhysicalSize<u32>, PhysicalSize<u32>) {
    let margin = (16.0 * scale).round() as u32;
    let available = PhysicalSize::new(
        work.width.saturating_sub(frame.width + 2 * margin).max(1),
        work.height.saturating_sub(frame.height + 2 * margin).max(1),
    );
    let preferred = PhysicalSize::new(
        ((1320.0 * scale).round() as u32).min(available.width),
        ((800.0 * scale).round() as u32).min(available.height),
    );
    let minimum = PhysicalSize::new(
        ((850.0 * scale).round() as u32).min(available.width),
        ((650.0 * scale).round() as u32).min(available.height),
    );
    (preferred, minimum)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fits_work_area_including_title_bar_at_common_display_scales() {
        for scale in [1.0, 1.25, 1.5, 2.0] {
            for (width, height) in [(1366, 728), (1920, 1032), (1280, 672)] {
                let frame = PhysicalSize::new(16, (39.0 * scale) as u32);
                let (size, minimum) = fitted_sizes(PhysicalSize::new(width, height), frame, scale);
                assert!(size.width + frame.width <= width);
                assert!(size.height + frame.height <= height);
                assert!(minimum.width <= size.width);
                assert!(minimum.height <= size.height);
            }
        }
    }

    #[test]
    fn keeps_preferred_size_when_desktop_has_room() {
        let (size, _) = fitted_sizes(
            PhysicalSize::new(2560, 1392),
            PhysicalSize::new(16, 39),
            1.0,
        );
        assert_eq!(size, PhysicalSize::new(1320, 800));
    }
}
