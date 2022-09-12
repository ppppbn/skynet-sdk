# Skynet

## Description

Skynet is a simple Javascript script that traces errors, collects data about website performance and report to backend service for later data analyze. This enables us to always be on top of our Javascript errors.

## How to use

### Insert

It is a good practice to use Asynchronous syntax to load the script. This helps to optimize the user experience on the website that are using the SDK. This approach reduces chances of the SDK library interfering with the hosting website.

<script async type="text/javascript" src="skynet-v-${version}.js"></script>
directly after your browsers <code>&lt;head></code> tag.

### Optionally, after the script tag, you can add additional parameters to Skynet

NOTE: When using an Asynchronous approach, It is ill-advised to execute SDK initialization functions before all libraries are loaded, parsed and executed in the hosting page.
Therefore, only initilize Skynet configuration variables **after** the script is loaded.

/*Optional to allow the error message to also be presented to the user*/

    Skynet.debugMode = true;

/*Optionally add additional debug information to the skynet.info*/

    Skynet.additionalInfo = "May be you can put the project id here?"

/*Optionally specify URL to which the logging should be done*/

    Skynet.backendUrl = YOUR_URL_HERE;

/*Optionally specify certain querystring parameters never to pass to the logging service

  either on the file location or the server name. Simply list them in the array

  and script will check for them (case insensitive)*/

    Skynet.qsIgnore = ["username","password"];

/*If you want to ignore certain domains from reporting, add them to*/

    Skynet.domainIgnore = ["https://do.not.track.com"]

/*Limit number of errors that will be sent for a page (default is 10, false allows infinite)*/

    Skynet.reportThreshold = 10;

### The options are

* **skynet.debugMode**: Set to true if you'd like the web browser not
  to swallow in-browser errors.
* **skynet.metadata**: Represent metadata, such as **identity** and **customerId**.
* **skynet.additionalInfo**: A custom string bundled with the HTTP GET request.
  Can be used to add additional information, such as a customer number,
  extra state or similar.
* **skynet.url**: The absolute URL to which POST requests will be made.
* **skynet.qsIgnore**: populates an array of querystring parameters to be stripped before reporting
* **skynet.domainIgnore**: populates an array of prefixes that will be ignored on file location before reporting, can be used to avoid reporting on ad server or 3rd party sites.
* **skynet.reportThreshold**: Max number of errors that will be reported for a page

## Design philosophy

This SDK was designed to track errors, collect performance & analysis data of customers mostly in two big applications of Telio: Zalo Store and Sales Companion Tools. Hence, it should be native, short, fast, clean and readable.

Therefore based on the widely adopted good practice, is to write SDK with vanilla JavaScript. Languages compiling to Javascript are not recommended.

It is also recommended not to use libraries such as jQuery in SDK development. The exception is of course when it is really important. To add a new library to the project, please ask for permissions from your supervisor or leader first.

This project used Webpack 5 to bundle resources. This reduce the size of the script to 4kb and make it a lightweight SDK to suit our purposes.

Backward compatibility is paramount. Every new SDK version released should be enabled with support of previous older versions. Likewise, current version should be designed to support future SDK versions. This is referred to as Forward compatibility.

Moreover, the code should speak for itself. Code must be clean, readable and well commented.

## Measuring performance metrics

### First Paint and First Contentful Paint

First Paint is the time between navigation and when the browser renders the first pixels to the screen, rendering anything that is visually different from the default background color of the body.

First Contentful Paint (FCP) is when the browser renders the first bit of content from the DOM, providing the first feedback to the user that the page is actually loading.

To measure these two metrics, we use the interface **PerformanceObserver** with type **paint**

### Largest Contentful Paint

Largest Contentful Paint (LCP) is a measurement of how long the largest element on the page takes to render. The Largest Contentful Paint metric works under the assumption that the page is useful to the user once they can see the largest piece of content.

LCP is not a single measurement, but a series of measurements. An additional **LargestContentfulPaint** entry is created every time a new largest element is rendered. The LCP metric can be boiled down to a single value by using the last LargestContentfulPaint entry in a page load. Only image, video and text-containing block level elements can trigger LCP entries.

What constitutes “largest” varies by element type. Image element size is determined by the size of the image as shown on the page. Text-containing element size is the smallest box than encompasses the text itself.

We can also measure LCP by using **PerformanceObserver** API. However, Last Contentful Paint should not be measured when the page is loaded in a background tab. The measurement only indicates when the user first brought the tab to the foreground in that case. This is why we have an additional check to prevent measurement of background tabs

## Changelog documentation

Please refer to [changelog file](changelog.md) for changelog of all versions.