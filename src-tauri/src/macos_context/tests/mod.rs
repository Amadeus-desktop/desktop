use super::*;

#[test]
fn classifies_known_work_apps() {
    assert_eq!(
        classify_app("com.microsoft.VSCode", "Visual Studio Code"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.apple.dt.Xcode", "Xcode"),
        AppCategory::Work
    );
    assert_eq!(classify_app("", "한글"), AppCategory::Work);
}

#[test]
fn classifies_known_non_work_apps() {
    assert_eq!(
        classify_app("com.google.Chrome", "YouTube - Google Chrome"),
        AppCategory::NonWork
    );
    assert_eq!(classify_app("", "Netflix"), AppCategory::NonWork);
}

#[test]
fn classifies_unknown_apps() {
    assert_eq!(
        classify_app("dev.unknown.App", "Unknown"),
        AppCategory::Unknown
    );
}
