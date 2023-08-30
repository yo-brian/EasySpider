import json
import os
import re
import subprocess
import sys
import requests
import platform
import shutil
import zipfile
import urllib.request
if sys.platform == "win32":
    import winreg
import re

def get_processor_info():
    if os.uname().sysname == 'Darwin':
        processor_info = subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string']).strip()
        processor_info = str(processor_info)
        if 'Intel' in processor_info:
            return 'Intel'
        elif 'Apple' in processor_info:
            return 'Apple'
        else:
            return 'Unknown'
    else:
        return 'This method is only implemented for macOS.'

def download_and_extract_zip(url, destination_folder):
    # 下载ZIP文件
    urllib.request.urlretrieve(url, "temp.zip")

    # 解压ZIP文件
    with zipfile.ZipFile("temp.zip", "r") as zip_ref:
        zip_ref.extractall(destination_folder)

    # 删除临时ZIP文件
    os.remove("temp.zip")


def copy_file(source_file, destination_file):
    # 使用copy2()函数复制文件
    shutil.copy2(source_file, destination_file)


def copy_folder(source_folder, destination_folder):
    # 使用copytree()函数复制文件夹及其内容
    shutil.copytree(source_folder, destination_folder)


def get_chrome_version():
    version = "115"
    if sys.platform == "win32":
        version_re = re.compile(r"^[1-9]\d*\.\d*.\d*")
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\BLBeacon"
            )
            _v, type = winreg.QueryValueEx(key, "version")
            return version_re.findall(_v)[0][:3]
        except WindowsError as e:
            print("check Chrome failed:{}".format(e))
    else:
        return version

chrome_version = get_chrome_version()  # 要更新的chromedriver版本

print("Detected your chrome version is: ", chrome_version)

chrome_driver_url = "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json"
win64_chrome_path = "C:\\Program Files\\Google\\Chrome\\Application"
win32_chrome_path = "C:\\Program Files\\Google\\Chrome\\Application"
mac_chrome_path = "/Applications/Google Chrome.app"
linux_chrome_path = "/opt/google/chrome"
old_driver_version = {
    "100":"100.0.4896.60",
    "101":"101.0.4951.41",
    "102":"102.0.5005.61",
    "103":"103.0.5060.134",
    "104":"104.0.5112.79",
    "105":"105.0.5195.52",
    "106":"106.0.5249.61",
    "107":"107.0.5304.62",
    "108":"108.0.5359.71",
    "109":"109.0.5414.74",
    "110":"110.0.5481.77",
    "111":"111.0.5563.64",
    "112":"112.0.5615.49",
    "113":"113.0.5672.63",
    "114":"114.0.5735.90",
}

if __name__ == "__main__":
    driver_downloads = []
    response = requests.get(chrome_driver_url)
    if response.status_code == 200:
        versions = json.loads(response.content)["versions"]
        versions = versions[::-1] # 倒序排列数组
        for info in versions:
            version = info["version"]
            if version.find(chrome_version) >= 0:
                downloads = info["downloads"]
                if "chromedriver" in downloads:
                    print(info["version"])
                    driver_downloads = downloads["chromedriver"]
                    break
    else:
        print("Error: " + response.status_code)
        exit(1)
    if not driver_downloads and int(chrome_version) < 115:
        if chrome_version not in old_driver_version:
            print("没有可用的chromedriver")
            exit(1)
        full_version = old_driver_version[chrome_version]
        driver_downloads = [
            {
                "platform": "linux64",
                "url": f"http://chromedriver.storage.googleapis.com/{full_version}/chromedriver_linux64.zip",
            },
            {
                "platform": "mac-arm64",
                "url": f"http://chromedriver.storage.googleapis.com/{full_version}/chromedriver_mac_arm64.zip",
            },
            {
                "platform": "mac-x64",
                "url": f"http://chromedriver.storage.googleapis.com/{full_version}/chromedriver_mac64.zip",
            },
            {
                "platform": "win32",
                "url": f"http://chromedriver.storage.googleapis.com/{full_version}/chromedriver_win32.zip",
            },
            {
                "platform": "win64",
                "url": f"http://chromedriver.storage.googleapis.com/{full_version}/chromedriver_win32.zip",
            },
        ]

    if os.path.exists("./chromedrivers"):
        shutil.rmtree("./chromedrivers")
    os.mkdir("./chromedrivers")
    if sys.platform == "win32" and platform.architecture()[0] == "64bit":
        for download in driver_downloads:
            if download["platform"] == "win64":
                url = download["url"]
                print("ChromeDriver will be downloaded from: ", url)
                break
        download_and_extract_zip(url, "./chromedrivers")
        if os.path.exists("./chrome_win64"):
            shutil.rmtree("./chrome_win64")
        copy_folder(win64_chrome_path, "./chrome_win64")
        for folder in os.listdir("./chrome_win64"):
            if folder[0].isdigit() and os.path.isdir("./chrome_win64/"+folder):
                shutil.rmtree("./chrome_win64/"+folder+"/Installer") # 删除Installer文件夹
        copy_file("./execute_win64.bat", "./chrome_win64/execute.bat")
        copy_file("./stealth.min.js", "./chrome_win64/stealth.min.js")
        try:
            copy_file(
                "./chromedrivers/chromedriver-win64/chromedriver.exe",
                "./chrome_win64/chromedriver_win64.exe",
            )
        except:
            copy_file(
                "./chromedrivers/chromedriver.exe",
                "./chrome_win64/chromedriver_win64.exe",
            )
        finally:
            shutil.rmtree("./chromedrivers")
    elif sys.platform == "win32" and platform.architecture()[0] == "32bit":
        for download in driver_downloads:
            if download["platform"] == "win32":
                url = download["url"]
                print("ChromeDriver will be downloaded from: ", url)
                break
        download_and_extract_zip(url, "./chromedrivers")
        if os.path.exists("./chrome_win32"):
            shutil.rmtree("./chrome_win32")
        copy_folder(win64_chrome_path, "./chrome_win32")
        for folder in os.listdir("./chrome_win32"):
            if folder[0].isdigit() and os.path.isdir("./chrome_win32/"+folder):
                shutil.rmtree("./chrome_win32/"+folder+"/Installer") # 删除Installer文件夹
        copy_file("./execute_win32.bat", "./chrome_win32/execute.bat")
        copy_file("./stealth.min.js", "./chrome_win32/stealth.min.js")
        try:
            copy_file(
                "./chromedrivers/chromedriver-win32/chromedriver.exe",
                "./chrome_win32/chromedriver_win32.exe",
            )
        except:
            copy_file(
                "./chromedrivers/chromedriver.exe",
                "./chrome_win32/chromedriver_win64.exe",
            )
        finally:
            shutil.rmtree("./chromedrivers")
    elif sys.platform == "linux" and platform.architecture()[0] == "64bit":
        pass
    elif sys.platform == "darwin" and platform.architecture()[0] == "64bit":
        processor = get_processor_info()
        if processor == "Intel":
            driver_arch = "mac-x64"
        elif processor == "Apple":
            driver_arch = "mac-arm64"
        for download in driver_downloads:
            if download["platform"] == driver_arch:
                url = download["url"]
                print("ChromeDriver will be downloaded from: ", url)
                break
        download_and_extract_zip(url, "./chromedrivers")
        if os.path.exists("./chrome_mac64.app"):
            shutil.rmtree("./chrome_mac64.app")
        # copy_folder(mac_chrome_path, "./chrome_mac64.app")
        subprocess.call(["cp", "-R", mac_chrome_path, "./chrome_mac64.app"])
        try:
            copy_file(
                "./chromedrivers/chromedriver-%s/chromedriver" % driver_arch,
                "./chromedriver_mac64",
            )
        except:
            copy_file(
                "./chromedrivers/chromedriver",
                "./chromedriver_mac64",
            )
        finally:
            shutil.rmtree("./chromedrivers")
        os.chmod("./chromedriver_mac64", 0o755)
        os.chmod("./chrome_mac64.app", 0o555)
        os.chmod("./chrome_mac64.app/Contents/MacOS/Google Chrome", 0o555)

    print("Done and don't forget to generate executestage EXEcutable program!")
