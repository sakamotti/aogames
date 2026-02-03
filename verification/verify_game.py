from playwright.sync_api import sync_playwright

def verify_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a landscape context
        context = browser.new_context(viewport={'width': 800, 'height': 400})
        page = context.new_page()

        # Navigate to the game
        page.goto("http://localhost:8000/star_catcher/")

        # Wait a bit for stars to spawn (1 second spawn interval)
        page.wait_for_timeout(2000)

        # Take screenshot
        page.screenshot(path="verification/game_screenshot.png")

        browser.close()

if __name__ == "__main__":
    verify_game()
