# Converts all .webm files in the 'in' directory to .gifs
for i in in/*.webm;
  do name=$(echo "$i" | cut -d'.' -f1 | cut -c 4-)
  echo "converted: $name"
  ffmpeg -loglevel panic -i "$i" -pix_fmt rgb8 "out/${name}.gif" -y
done