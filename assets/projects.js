/* Проекты для блока «Работы» и страницы «Все проекты».
   Чтобы добавить проект: положите скриншот первого экрана (16:10, например 1280×800) в папку works/
   и добавьте строку в список. Первые 4 проекта показываются на главной. */
window.PROJECTS = [
  {name:'AirStep', url:'https://staswebdesign.github.io/airstep/', img:'works/p-airstep.jpg', tag:'Интернет-магазин', desc:'Магазин кроссовок: каталог с фильтрами, корзина, личный кабинет, доставка СДЭК и Почтой России'},
  {name:'DiMax Auto', url:'https://staswebdesign.github.io/dimax/', img:'works/p-dimax.jpg', tag:'Сайт компании', desc:'Прокат автомобилей во Владивостоке: витрина автопарка, цены по срокам аренды, бронь в мессенджере'},
  {name:'Аркон Авто', url:'https://staswebdesign.github.io/arkon/', img:'works/p-arkon.jpg', tag:'Сайт компании', desc:'Авто под заказ из Японии, Кореи и Китая: калькулятор стоимости, этапы, привезённые машины'},
  {name:'Заряд', url:'https://zaryad-fit.ru/', img:'works/p-zaryad.jpg', tag:'Лендинг', desc:'Спортивный клуб в Хабаровске: направления, расписание, цены, тренеры и запись'},
  {name:'Beauty Magic', url:'https://maria-beauty.ru/', img:'works/p-maria.jpg', tag:'Лендинг', desc:'Студия красоты в Хабаровске: услуги и прайс, работы мастера, подарочные сертификаты, отзывы'}
];
window.renderProjects = function (el, limit, base) {
  base = base || '';
  var list = limit ? PROJECTS.slice(0, limit) : PROJECTS;
  el.innerHTML = list.map(function (p, k) {
    return '<a class="pj rv' + (k % 2 ? ' d1' : '') + '" href="' + p.url + '" target="_blank" rel="noopener">' +
      '<div class="pj-f"><div class="pj-bar"><i></i><i></i><i></i></div>' +
      '<div class="pj-s"><img src="' + base + p.img + '" alt="Сайт ' + p.name + '" loading="lazy" width="1280" height="800"></div></div>' +
      '<div class="pj-m"><div><b>' + p.name + '</b><p>' + p.desc + '</p></div><span class="tag">' + p.tag + '</span></div></a>';
  }).join('');
};
