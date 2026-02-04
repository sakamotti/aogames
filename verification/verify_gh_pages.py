from playwright.sync_api import sync_playwright

def verify_gh_pages():
    repo_path = "/kids-games/"
    base_url = f"http://localhost:8001{repo_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print(f"Navigating to {base_url}...")
        try:
            # 1. Check Launcher Load
            page.goto(base_url)
            page.wait_for_selector(".game-grid")
            print("Launcher loaded successfully in subdirectory.")

            # 2. Check Navigation to a Game
            # Click the Star Catcher link
            page.click("a[href='games/star_catcher/index.html']")

            # Wait for game canvas
            page.wait_for_selector("#gameCanvas")
            print("Navigated to Star Catcher successfully.")

            # 3. Check Back Button (injected by shared/script.js)
            # It should point to ../../index.html relative to the game,
            # which resolves to /kids-games/index.html
            page.wait_for_selector("#back-button")

            # Click back
            page.click("#back-button")

            # Should be back at launcher
            page.wait_for_selector(".game-grid")
            print("Back navigation worked successfully.")

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/gh_pages_failure.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_gh_pages()
