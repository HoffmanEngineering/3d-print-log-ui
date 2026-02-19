List of issues found while testing the multi-image implementation.

## Edit Page

1. Thumbnail + icon is not centered in the button.
1. Delete X icon not centered in circle
1. Set As Default icon not centered in circle
1. Thumbnails are aligned to the left side instead of being evenly spaced
1. I think there is a race condition when saving the images. They are all POST'd at the same time, and when we reload the print the API returns the images with duplicate display orders.

```
images: [
    {
        "id": 7083,
        "isDefault": false,
        "displayOrder": 0
    },
    {
        "id": 7084,
        "isDefault": true,
        "displayOrder": 1
    },
    {
        "id": 7085,
        "isDefault": false,
        "displayOrder": 1
    },
    {
        "id": 7086,
        "isDefault": false,
        "displayOrder": 1
    },
    {
        "id": 7087,
        "isDefault": false,
        "displayOrder": 1
    }
]
```
