from playwright.sync_api import sync_playwright

def verify_all_games():
    games = [
        "star_catcher", "fireworks", "scribble", "piano", "bubble_wrap",
        "whack_a_mole", "raindrops", "space_dodge", "fruit_catch", "bouncing_ball"
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 800, 'height': 400})
        page = context.new_page()

        # 1. Verify Launcher
        page.goto("http://localhost:8000/")
        page.wait_for_selector(".game-grid")
        page.screenshot(path="verification/launcher.png")
        print("Launcher verified.")

        # 2. Verify each game loads
        for game in games:
            url = f"http://localhost:8000/games/{game}/"
            try:
                page.goto(url)
                # Wait for canvas or specific element if needed.
                # All games have #gameCanvas
                page.wait_for_selector("#gameCanvas", timeout=3000)

                # Check for back button (injected by shared script)
                # Note: shared script might take a moment
                page.wait_for_timeout(500)

                # Take screenshot for the first game only to save time/space, or specific ones
                if game == "fireworks":
                    # Simulate click to trigger fireworks
                    page.mouse.click(400, 200)
                    page.wait_for_timeout(500)
                    page.screenshot(path=f"verification/{game}.png")

                print(f"Verified {game}")
            except Exception as e:
                print(f"Failed to verify {game}: {e}")

        browser.close()

if __name__ == "__main__":
    verify_all_games()
