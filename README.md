# Fireball Studios website

This folder contains the complete static website for GitHub Pages.

## Publish on GitHub Pages

1. Add every file and the `images` folder to a GitHub repository without changing the folder structure.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select the branch and `/ (root)` folder.
4. If you use `fireballstudios.co.uk`, add the custom domain in the same Pages settings and update the DNS records shown by GitHub.

## Activate the enquiry form

The contact form is connected to FormSubmit and sends submissions to `info.fireballstudios@gmail.com`.

After the site is published, submit one test enquiry. FormSubmit will email an activation link to the Gmail address. Open that email and confirm the form. Enquiries will not be delivered until this activation step is completed.

The form accepts PDF, image, drawing and common CAD files, with a maximum combined upload size of 10 MB.
## GitHub Pages compatibility

The package has been checked for GitHub Pages deployment: local HTML/CSS/JS/image references resolve within the package, the interactive 3D iframes are not sandbox-restricted, and `.nojekyll` is included so the folder can be served as a plain static site. Internal links use relative paths, so the site also works when the repository is published under a GitHub Pages project subpath.
